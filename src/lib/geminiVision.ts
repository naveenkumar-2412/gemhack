import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../config.js";

let _client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI | null {
  if (!config.geminiApiKey) return null;
  if (!_client) _client = new GoogleGenerativeAI(config.geminiApiKey);
  return _client;
}

export interface VisionArgs {
  systemInstruction: string;
  userPrompt: string;
  imageBase64: string;
  mimeType?: string;
}

export async function generateWithVision({
  systemInstruction,
  userPrompt,
  imageBase64,
  mimeType = "image/png"
}: VisionArgs): Promise<string> {
  const client = getClient();
  if (!client) {
    return "[Mock Vision] Configure GEMINI_API_KEY to enable multimodal image analysis.";
  }

  const model = client.getGenerativeModel({
    model: config.geminiModel,
    systemInstruction
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.geminiTimeoutMs);

  try {
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: imageBase64
        }
      },
      { text: userPrompt }
    ]);
    return result.response.text()?.trim() || "No response generated.";
  } catch (err) {
    try {
      const retry = await model.generateContent([
        { inlineData: { mimeType, data: imageBase64 } },
        { text: userPrompt }
      ]);
      return retry.response.text()?.trim() || "No response generated.";
    } catch {
      throw err;
    }
  } finally {
    clearTimeout(timeout);
  }
}
