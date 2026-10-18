import dotenv from "dotenv";
dotenv.config({ override: true });
import express from "express";
import path from "path";
import cors from "cors";
import multer from "multer";
import crypto from "crypto";
import { parseTimetable } from "./src/services/server/timetableParser";
import { syncToGoogleCalendar, deleteFromGoogleCalendar } from "./src/services/server/calendarService";
import { handleCampusChat, parseCampusIntent } from "./src/services/server/chatService";
import cron from "node-cron";
import admin from "firebase-admin";
import { GoogleGenAI } from "@google/genai";

// Helper to validate and clean PEM private keys safely without triggering OpenSSL decode exceptions
function validateAndCleanPrivateKey(key: string): string | null {
  try {
    let pkey = key.trim();
    if ((pkey.startsWith('"') && pkey.endsWith('"')) || (pkey.startsWith("'") && pkey.endsWith("'"))) {
      pkey = pkey.slice(1, -1).trim();
    }
    pkey = pkey.replace(/\\n/g, '\n').replace(/\\r/g, '');

    const match = pkey.match(/-----BEGIN [A-Z0-9_\s]+-----\s*([\s\S]+?)\s*-----END [A-Z0-9_\s]+-----/);
    let normalized = pkey;
    if (match && match[1]) {
      const base64Only = match[1].replace(/\s+/g, '');
      if (/^[A-Za-z0-9+/=]+$/.test(base64Only)) {
        const lines = base64Only.match(/.{1,64}/g)?.join('\n') || base64Only;
        normalized = `-----BEGIN PRIVATE KEY-----\n${lines}\n-----END PRIVATE KEY-----\n`;
      }
    } else {
      const base64Only = pkey.replace(/\s+/g, '');
      if (/^[A-Za-z0-9+/=]+$/.test(base64Only) && base64Only.length > 100) {
        const lines = base64Only.match(/.{1,64}/g)?.join('\n') || base64Only;
        normalized = `-----BEGIN PRIVATE KEY-----\n${lines}\n-----END PRIVATE KEY-----\n`;
      }
    }

    // Verify key format with Node crypto before passing to firebase-admin
    crypto.createPrivateKey({
      key: normalized,
      format: 'pem'
    });

    return normalized;
  } catch {
    return null;
  }
}

// Initialize Firebase Admin with resilient parsing and ADC fallback
function initFirebaseAdmin() {
  if (admin.apps.length > 0) return;

  const rawConfig = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  const defaultProjectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || "rsu-campus-map";

  if (rawConfig) {
    try {
      let jsonStr = rawConfig;
      if (!jsonStr.startsWith('{') && !jsonStr.startsWith('"')) {
        try {
          const decoded = Buffer.from(jsonStr, 'base64').toString('utf-8');
          if (decoded.trim().startsWith('{')) {
            jsonStr = decoded.trim();
          }
        } catch {
          // ignore base64 decode failure
        }
      }

      if (jsonStr.startsWith('{')) {
        const serviceAccount = JSON.parse(jsonStr);
        const validKey = serviceAccount.private_key ? validateAndCleanPrivateKey(String(serviceAccount.private_key)) : null;

        if (validKey) {
          serviceAccount.private_key = validKey;
          try {
            admin.initializeApp({
              credential: admin.credential.cert(serviceAccount),
              projectId: serviceAccount.project_id || defaultProjectId,
            });
            console.log("Firebase Admin initialized with service account.");
            return;
          } catch (certError: any) {
            console.log("Firebase Admin service account initialization skipped:", certError.message);
          }
        }
      }
    } catch {
      // ignore JSON parse failure
    }
  }

  // Graceful fallback to Application Default Credentials or default project config
  try {
    admin.initializeApp({
      projectId: defaultProjectId,
    });
    console.log(`Firebase Admin initialized with project configuration (${defaultProjectId}).`);
  } catch (fallbackError: any) {
    console.log("Firebase Admin init note:", fallbackError.message);
  }
}

initFirebaseAdmin();

// Strict payload caps and memory limits
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file upload
    files: 1
  }
});

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

// In-Memory IP Sliding Window Rate Limiter
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const rateLimitStore = new Map<string, RateLimitRecord>();

function createRateLimiter(options: { maxRequests: number; windowMs: number; name: string }) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const rawIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
    const ip = (Array.isArray(rawIp) ? rawIp[0] : rawIp.split(",")[0]).trim();
    const key = `${options.name}:${ip}`;
    const now = Date.now();

    const record = rateLimitStore.get(key);
    if (!record || now > record.resetAt) {
      rateLimitStore.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }

    if (record.count >= options.maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
      res.setHeader("Retry-After", retryAfterSeconds);
      return res.status(429).json({
        error: `Rate limit exceeded for ${options.name}. Maximum ${options.maxRequests} requests per minute permitted. Please wait ${retryAfterSeconds}s before retrying.`
      });
    }

    record.count++;
    return next();
  };
}

// Clean up expired rate-limit records periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 3 * 60 * 1000);

// Endpoint-specific Rate Limiters
const chatLimiter = createRateLimiter({ name: "chat", maxRequests: 30, windowMs: 60 * 1000 });
const ttsLimiter = createRateLimiter({ name: "tts", maxRequests: 20, windowMs: 60 * 1000 });
const timetableLimiter = createRateLimiter({ name: "timetable", maxRequests: 10, windowMs: 60 * 1000 });

// Daily Briefing Cron (7:00 AM) - only start if not in a serverless function, e.g., on Cloud Run
if (!process.env.VERCEL) {
  cron.schedule("0 7 * * *", async () => {
    console.log("Running Daily Briefing Cron...");
    if (!admin.apps.length) return;
    
    const db = admin.firestore();
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    
    try {
      const syncsSnapshot = await db.collection('user_syncs').get();
      for (const syncDoc of syncsSnapshot.docs) {
        const { userId, timetableId } = syncDoc.data();
        
        const slotsSnapshot = await db.collection('timetables').doc(timetableId)
          .collection('slots').where('day', '==', today).get();
        
        if (!slotsSnapshot.empty) {
          const classes = slotsSnapshot.docs.map(d => d.data().courseCode).join(", ");
          await db.collection('notifications').add({
            userId,
            title: "Today's Briefing",
            message: `Good morning! You have ${slotsSnapshot.size} classes today: ${classes}. Stay focused!`,
            type: "briefing",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            read: false
          });
        }
      }
    } catch (error) {
      console.error("Cron Error:", error);
    }
  });
}

// API health check
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    hasGeminiKey: !!process.env.GEMINI_API_KEY 
  });
});

// Protected Chat Intent API
app.post("/api/chat/intent", chatLimiter, async (req, res) => {
  console.log("POST /api/chat/intent");
  try {
    const { message, locations, timetable, events } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Missing or invalid 'message' string in request body" });
    }
    if (message.length > 1000) {
      return res.status(400).json({ error: "Message length exceeds maximum limit of 1000 characters" });
    }
    const result = await parseCampusIntent(message, locations || [], timetable, events);
    res.json(result);
  } catch (error: any) {
    console.error("Intent error:", error);
    res.status(500).json({ error: error.message || "Failed to parse campus intent" });
  }
});

// Protected Chat Response API
app.post("/api/chat/response", chatLimiter, async (req, res) => {
  console.log("POST /api/chat/response");
  try {
    const { message, context, locations } = req.body;
    if (message && typeof message === "string" && message.length > 1000) {
      return res.status(400).json({ error: "Message length exceeds maximum limit of 1000 characters" });
    }
    const result = await handleCampusChat(message || "", context || {}, locations || []);
    res.json({ text: result });
  } catch (error: any) {
    console.error("Chat error:", error);
    res.status(500).json({ error: error.message || "Failed to generate chat response" });
  }
});

// Protected Server-Side Text-To-Speech (TTS) API
app.post("/api/tts/generate", ttsLimiter, async (req, res) => {
  console.log("POST /api/tts/generate");
  try {
    const { text, voiceName = "Kore" } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Missing or invalid 'text' parameter in request body" });
    }
    const cleanText = text.trim();
    if (cleanText.length === 0) {
      return res.status(400).json({ error: "Text string cannot be empty" });
    }
    if (cleanText.length > 500) {
      return res.status(400).json({ error: "Text length exceeds maximum allowed limit of 500 characters" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: "Server TTS unavailable: GEMINI_API_KEY is not configured on the backend" });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const safeVoice = ["Puck", "Charon", "Kore", "Fenrir", "Zephyr"].includes(voiceName) ? voiceName : "Kore";

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash-lite-tts",
      contents: [
        {
          text: `Say clearly and helpfully: ${cleanText}`,
        },
      ],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: safeVoice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return res.status(502).json({ error: "TTS model did not return synthesized audio" });
    }

    res.json({
      success: true,
      audioBase64: base64Audio,
      format: "audio/wav",
    });
  } catch (error: any) {
    console.error("TTS generation error:", error);
    res.status(500).json({ error: error.message || "Failed to generate speech audio" });
  }
});

// Protected Timetable Parsing API
app.post("/api/timetable/parse", timetableLimiter, upload.single("file"), async (req, res) => {
  console.log("POST /api/timetable/parse - Start");
  try {
    if (!req.file) {
      console.error("No file uploaded in request");
      return res.status(400).json({ error: "No file uploaded" });
    }
    console.log(`File received: ${req.file.originalname} (${req.file.mimetype}, ${req.file.size} bytes)`);
    const result = await parseTimetable(req.file.buffer, req.file.mimetype);
    console.log("Parsing successful");
    res.json(result);
  } catch (error: any) {
    console.error("Critical parsing error:", error);
    res.status(500).json({ error: error.message || "Internal server error during parsing" });
  }
});

// Google Calendar Sync API
app.post("/api/calendar/sync", async (req, res) => {
  console.log("POST /api/calendar/sync");
  try {
    const { accessToken, slots } = req.body;
    if (!accessToken || !slots) {
      return res.status(400).json({ error: "Missing accessToken or slots" });
    }
    const result = await syncToGoogleCalendar(accessToken, slots);
    res.json({ success: true, count: result.length, events: result });
  } catch (error: any) {
    console.error("Sync error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Google Calendar Delete API
app.post("/api/calendar/delete", async (req, res) => {
  console.log("POST /api/calendar/delete");
  try {
    const { accessToken, eventIds } = req.body;
    if (!accessToken || !eventIds) {
      return res.status(400).json({ error: "Missing accessToken or eventIds" });
    }
    const results = await deleteFromGoogleCalendar(accessToken, eventIds);
    res.json({ success: true, results });
  } catch (error: any) {
    console.error("Delete error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Administrative Deletion Endpoints (Guarantees App Owner / Admin Deletion Authority)
const APP_OWNER_EMAIL = "progressphilemon@gmail.com";
const ADMIN_EMAILS = [APP_OWNER_EMAIL, "admin@rsu.edu.ng"];

app.post("/api/admin/timetable/delete", async (req, res) => {
  console.log("POST /api/admin/timetable/delete");
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing authorization token" });
    }
    const token = authHeader.split("Bearer ")[1];
    let userEmail = "";
    let userId = "";

    try {
      const decoded = await admin.auth().verifyIdToken(token);
      userEmail = (decoded.email || "").toLowerCase().trim();
      userId = decoded.uid;
    } catch (e: any) {
      return res.status(401).json({ error: "Invalid authentication token: " + e.message });
    }

    const { timetableId } = req.body;
    if (!timetableId) {
      return res.status(400).json({ error: "Missing timetableId" });
    }

    const db = admin.firestore();
    const timetableRef = db.collection("timetables").doc(timetableId);
    const docSnap = await timetableRef.get();

    const isOwner = userEmail === APP_OWNER_EMAIL.toLowerCase();
    const isAdmin = isOwner || ADMIN_EMAILS.includes(userEmail);

    if (docSnap.exists) {
      const data = docSnap.data() || {};
      const isCreator = data.creatorId === userId || data.ownerId === userId || (data.creatorEmail && data.creatorEmail.toLowerCase() === userEmail);

      if (!isAdmin && !isCreator) {
        return res.status(403).json({ error: "Permission denied: Only the creator or app owner can delete this timetable." });
      }

      // Batch delete slots subcollection
      try {
        const slotsSnapshot = await timetableRef.collection("slots").get();
        const batch = db.batch();
        slotsSnapshot.docs.forEach(d => batch.delete(d.ref));
        batch.delete(timetableRef);
        await batch.commit();
      } catch (err: any) {
        await timetableRef.delete();
      }
    } else {
      // Clean up orphaned slots if any
      try {
        const slotsSnapshot = await timetableRef.collection("slots").get();
        const batch = db.batch();
        slotsSnapshot.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
      } catch {}
    }

    res.json({ success: true, message: "Timetable deleted successfully" });
  } catch (err: any) {
    console.error("Admin delete timetable error:", err);
    res.status(500).json({ error: err.message || "Failed to delete timetable" });
  }
});

app.post("/api/admin/event/delete", async (req, res) => {
  console.log("POST /api/admin/event/delete");
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing authorization token" });
    }
    const token = authHeader.split("Bearer ")[1];
    let userEmail = "";
    let userId = "";

    try {
      const decoded = await admin.auth().verifyIdToken(token);
      userEmail = (decoded.email || "").toLowerCase().trim();
      userId = decoded.uid;
    } catch (e: any) {
      return res.status(401).json({ error: "Invalid authentication token: " + e.message });
    }

    const { eventId } = req.body;
    if (!eventId) {
      return res.status(400).json({ error: "Missing eventId" });
    }

    const db = admin.firestore();
    const eventRef = db.collection("events").doc(eventId);
    const docSnap = await eventRef.get();

    const isOwner = userEmail === APP_OWNER_EMAIL.toLowerCase();
    const isAdmin = isOwner || ADMIN_EMAILS.includes(userEmail);

    if (docSnap.exists) {
      const data = docSnap.data() || {};
      const isCreator = data.creatorId === userId || (data.creatorEmail && data.creatorEmail.toLowerCase() === userEmail);

      if (!isAdmin && !isCreator) {
        return res.status(403).json({ error: "Permission denied: Only the creator or app owner can delete this event." });
      }

      await eventRef.delete();
    }

    // Also record in deleted_events so it doesn't reappear
    try {
      await db.collection("deleted_events").doc(eventId).set({
        deletedAt: admin.firestore.FieldValue.serverTimestamp(),
        deletedBy: userEmail
      });
    } catch {}

    res.json({ success: true, message: "Event deleted successfully" });
  } catch (err: any) {
    console.error("Admin delete event error:", err);
    res.status(500).json({ error: err.message || "Failed to delete event" });
  }
});

// Ephemeral Live Location Sharing APIs with memory cache and admin Firestore backing
const liveSharesCache = new Map<string, any>();

app.post("/api/live_share/create", async (req, res) => {
  console.log("POST /api/live_share/create");
  try {
    const session = req.body;
    if (!session || !session.id) {
      return res.status(400).json({ error: "Invalid session payload" });
    }
    liveSharesCache.set(session.id, session);

    if (admin.apps.length) {
      try {
        await admin.firestore().collection("live_shares").doc(session.id).set(session);
      } catch (dbErr: any) {
        console.warn("Server Firestore live_shares write notice:", dbErr.message);
      }
    }
    res.json({ success: true, session });
  } catch (error: any) {
    console.error("Live share create error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/live_share/update", async (req, res) => {
  try {
    const { id, coordinates, updatedAt } = req.body;
    if (!id || !coordinates) {
      return res.status(400).json({ error: "Missing id or coordinates" });
    }
    const existing = liveSharesCache.get(id);
    if (existing) {
      liveSharesCache.set(id, {
        ...existing,
        coordinates,
        updatedAt: updatedAt || new Date().toISOString()
      });
    }

    if (admin.apps.length) {
      try {
        await admin.firestore().collection("live_shares").doc(id).update({
          coordinates,
          updatedAt: updatedAt || new Date().toISOString()
        });
      } catch (dbErr: any) {
        console.warn("Server Firestore live_shares update notice:", dbErr.message);
      }
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/live_share/stop", async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ error: "Missing id" });
    }
    const existing = liveSharesCache.get(id);
    if (existing) {
      liveSharesCache.set(id, {
        ...existing,
        isActive: false,
        updatedAt: new Date().toISOString()
      });
    }

    if (admin.apps.length) {
      try {
        await admin.firestore().collection("live_shares").doc(id).update({
          isActive: false,
          updatedAt: new Date().toISOString()
        });
      } catch (dbErr: any) {
        console.warn("Server Firestore live_shares stop notice:", dbErr.message);
      }
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/live_share/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const formattedId = (id || "").toUpperCase().trim();

    if (liveSharesCache.has(formattedId)) {
      return res.json({ session: liveSharesCache.get(formattedId) });
    }

    if (admin.apps.length) {
      try {
        const docSnap = await admin.firestore().collection("live_shares").doc(formattedId).get();
        if (docSnap.exists) {
          const data = docSnap.data();
          liveSharesCache.set(formattedId, data);
          return res.json({ session: data });
        }
      } catch (dbErr: any) {
        console.warn("Server Firestore live_shares fetch notice:", dbErr.message);
      }
    }

    res.json({ session: null });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// API 404 Handler - ensure all unmatched /api routes return JSON 404
app.all("/api/*all", (req, res) => {
  res.status(404).json({ error: `API route ${req.method} ${req.originalUrl} not found` });
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled Server Error:", err);
  res.status(err.status || 500).json({ 
    error: err.message || "Internal server error",
    details: process.env.NODE_ENV !== 'production' ? err.stack : undefined
  });
});

// Start listening if NOT running in serverless environment (Vercel)
const PORT = process.env.PORT || 3000;
if (!process.env.VERCEL) {
  async function startServer() {
    // Vite Middleware
    if (process.env.NODE_ENV !== "production") {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      
      app.get(["/privacy", "/privacy-policy"], (req, res) => {
        res.sendFile(path.join(distPath, "privacy.html"));
      });
      
      app.get(["/terms", "/terms-of-service"], (req, res) => {
        res.sendFile(path.join(distPath, "terms.html"));
      });

      app.get("*all", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    app.listen(Number(PORT), "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }

  startServer();
}

export default app;
