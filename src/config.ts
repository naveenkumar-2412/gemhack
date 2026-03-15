import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT ?? 8080),
  projectId: process.env.GOOGLE_CLOUD_PROJECT ?? "",
  location: process.env.GOOGLE_CLOUD_LOCATION ?? "us-central1",
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-2.0-flash",
  geminiLiveModel: process.env.GEMINI_LIVE_MODEL ?? "gemini-live-2.5-flash-preview",
  geminiLiveEnabled: process.env.GEMINI_LIVE_ENABLED === "true",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  geminiTimeoutMs: Number(process.env.GEMINI_TIMEOUT_MS ?? 25000),
  agentTimeoutMs: Number(process.env.AGENT_TIMEOUT_MS ?? 30000),
  firestoreCollection: process.env.FIRESTORE_COLLECTION ?? "sessions",
  gcsBucket: process.env.GCS_BUCKET ?? ""
};
