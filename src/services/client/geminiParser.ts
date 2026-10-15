/**
 * Secure timetable parser service.
 * All OCR and image parsing is routed securely through the backend proxy (/api/timetable/parse).
 * No API keys or Google GenAI SDK instances are ever bundled or exposed in client-side code.
 */

export async function parseTimetableOnServer(file: File): Promise<any> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/timetable/parse", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: `Server returned error status ${response.status}` }));
    throw new Error(errorData.error || `Server returned error status ${response.status}`);
  }

  return await response.json();
}

/**
 * Client-facing extraction handler.
 * Seamlessly forwards to the protected backend API endpoint.
 */
export async function parseTimetableOnClient(file: File): Promise<any> {
  return await parseTimetableOnServer(file);
}
