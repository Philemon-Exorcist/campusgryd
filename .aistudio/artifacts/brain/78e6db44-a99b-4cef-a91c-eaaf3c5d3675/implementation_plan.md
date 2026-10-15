# Security Remediation & API Key Hardening Plan

Comprehensive security audit and remediation to resolve the Google Cloud project suspension (`rsu-campus-map`), eliminate client-side secret exposure, implement secure server-side AI proxies with strict rate limiting, and provide an appeal guide for GCP reinstatement.

### User Review & Critical Decisions

> [!IMPORTANT]
> Google Cloud suspended project `rsu-campus-map` due to "abusive activity consistent with hijacked resources." Our audit revealed that Gemini API keys were configured in frontend environment variables (`VITE_GEMINI_API_KEY` / `NEXT_PUBLIC_GEMINI_API_KEY`) and directly accessed in browser client bundles (`src/App.tsx`, `geminiParser.ts`, `geminiService.ts`, `ChatBot.tsx`). Automated bots scrape public client bundles, harvest exposed keys, and exhaust API quotas.

- **Confirmed Decision 1**: All AI operations (timetable OCR parsing, campus assistant chat/intent, and voice directions TTS) will be routed strictly through backend Express server endpoints. No client-side `@google/genai` instances or `VITE_` AI keys will exist.
- **Confirmed Decision 2**: Purge all client-side references to `VITE_GEMINI_API_KEY` and `NEXT_PUBLIC_GEMINI_API_KEY` across `.env.example`, `geminiParser.ts`, `geminiService.ts`, `ChatBot.tsx`, and `App.tsx`.
- **Confirmed Decision 3**: Enforce strict sliding-window IP rate limiting, payload byte limits (10MB for timetable uploads, 10KB for chat), and origin checks on all `/api/*` endpoints to prevent proxy abuse.
- **Confirmed Decision 4**: Provide a ready-to-submit appeal template and step-by-step key restriction instructions for the Google Cloud Console to get the project unsuspended.

---

### 1. Overview & Core Concept

- **What It Does**: Hardens the entire CampusGryd infrastructure by shifting all Generative AI workloads to a secured server tier, eliminating all front-end key exposure vulnerabilities, guarding against automated DDoS or token scraping with IP rate limiters, and providing clear instructions to appeal and unlock the Google Cloud project.
- **Target Audience / Persona**: Students, faculty, and university administrators of Rivers State University using campus navigation, timetable management, and voice guidance.
- **Key Value**: Guarantees zero secret leakage into client browsers, prevents malicious actors from hijacking API quotas, and ensures compliance with Google Cloud Terms of Service.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  - *Campus Voice Guidance*: When a student requests audio directions, the browser sends the instruction text to the server endpoint `/api/tts/generate`. The server executes `gemini-3.8-flash-lite-tts` using the server-only `GEMINI_API_KEY` and streams back a high-fidelity WAV audio blob for playback. If offline or if the API is unreachable, the frontend gracefully falls back to the browser's native `window.speechSynthesis`.
  - *Timetable OCR Upload*: Student uploads a timetable photo or PDF. The file is uploaded via `POST /api/timetable/parse` to the server where it is validated, parsed with `gemini-2.5-flash`, and returned as structured JSON. Client-side OCR fallback that previously exposed keys is completely removed.
  - *Campus Assistant Chat*: Chat messages and location navigation intents are processed via `/api/chat/intent` and `/api/chat/response` backed by server-side rate limits.
  - *Security & Status Notices*: Non-intrusive status indicators if rate limits are hit (e.g. "Too many requests. Please wait a minute before trying again.").
- **Visual Identity & Theme**:
  - Maintains the existing green-and-emerald university design system (`#059669`, `#10b981`), dark slate cards, crisp typography, and high-contrast accessibility standards.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Server-Side TTS Proxy (`/api/tts/generate`) vs Client SDK**:
  - *Chosen Approach*: Implement an Express route using `@google/genai` model `gemini-3.8-flash-lite-tts` with voice `Kore`, returning clean WAV audio.
  - *Why*: Prevents bundling any Gemini credentials into `App.tsx`. Client receives pre-rendered audio without needing any API key.
  - *Fallback*: If the network is offline or quota is exceeded, seamlessly use native browser `SpeechSynthesisUtterance`.
- **Decision 2: Complete Elimination of `VITE_GEMINI_API_KEY`**:
  - *Chosen Approach*: Remove all reads of `VITE_GEMINI_API_KEY` and `NEXT_PUBLIC_GEMINI_API_KEY` from all frontend files and documentation. Only server-side `process.env.GEMINI_API_KEY` will be recognized.
  - *Why*: Any variable prefixed with `VITE_` is automatically compiled into client-side JS bundles by Vite, making it public to the world.
- **Decision 3: Express Rate Limiter Middleware**:
  - *Chosen Approach*: Implement in-memory IP sliding-window rate limiting on `/api/chat/*`, `/api/timetable/parse`, and `/api/tts/generate` (e.g. max 20 requests per minute per IP for chat, 5 uploads per minute for timetables).
  - *Why*: Prevents botnets or external actors from turning the server into an open proxy for free AI compute.
- **Decision 4: Google Cloud Key Rotation & API Restrictions**:
  - *Chosen Approach*: Instruct user to rotate the compromised Gemini API key in Google Cloud Console and restrict the Firebase Browser Key to only "Firebase Authentication" and "Cloud Firestore API" with HTTP referrer restrictions.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Client Browser (Vite)                         │
│                                                                        │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │ Navigation Voice │  │ Timetable Upload │  │ Campus Assistant Chat│  │
│  └────────┬─────────┘  └────────┬─────────┘  └──────────┬───────────┘  │
│           │                     │                       │              │
│           │ (No Keys Stored)    │ (No Keys Stored)      │              │
└───────────┼─────────────────────┼───────────────────────┼──────────────┘
            │                     │                       │
      POST /api/tts/generate  POST /api/timetable/parse  POST /api/chat/*
            │                     │                       │
┌───────────▼─────────────────────▼───────────────────────▼──────────────┐
│                       Express Backend (server.ts)                      │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │       Security Middleware: IP Rate Limiting + Payload Capping    │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
│                                     │                                  │
│  ┌──────────────────────────────────▼───────────────────────────────┐  │
│  │                Google GenAI SDK (Server-Side Only)               │  │
│  │                  Using process.env.GEMINI_API_KEY                │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
└─────────────────────────────────────┼──────────────────────────────────┘
                                      │
                         Google Cloud / Gemini API
                         (Private & Rate-Controlled)
```

#### Detailed Execution Steps:
1. **Server-Side TTS Endpoint**: Add `POST /api/tts/generate` to `server.ts` utilizing `gemini-3.8-flash-lite-tts`, returning audio base64 or binary WAV.
2. **Rate Limiting & Payload Protection**: Add robust sliding-window rate limiting middleware to `server.ts` to block repetitive automated queries on `/api/*`.
3. **Frontend Cleansing**:
   - Update `src/App.tsx`: Replace client `getAiInstance` and direct `@google/genai` calls with calls to `/api/tts/generate` and native speech fallback.
   - Update `src/services/client/geminiParser.ts`: Remove `parseTimetableOnClient`, strip all `VITE_GEMINI_API_KEY` lookups, and ensure all parsing strictly calls `/api/timetable/parse`.
   - Update `src/services/geminiService.ts`: Remove client `getAi()` and client SDK imports; all intent parsing and responses call `/api/chat/*`.
   - Update `src/components/Chat/ChatBot.tsx`: Check `/api/health` instead of client environment variables.
   - Update `.env.example`: Remove `VITE_GEMINI_API_KEY` and `NEXT_PUBLIC_GEMINI_API_KEY`.
4. **Project Suspension Appeal Guide**: Provide an exact, customized appeal draft for the user to submit in the Google Cloud Console appeal form shown in the screenshot.
