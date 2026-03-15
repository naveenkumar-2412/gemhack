import { getSessionTurns } from "./firestore.js";
import type { Content } from "@google/generative-ai";

/**
 * Load the last N turns for a session from Firestore and format them
 * as Gemini Content[] for use in chat history / context window.
 */
export async function buildContextHistory(
  sessionId: string,
  limit = 6
): Promise<Content[]> {
  if (!sessionId) return [];

  try {
    const turns = await getSessionTurns(sessionId, limit);
    const history: Content[] = [];

    // 1. Inject Semantic Recall (Phase 34)
    // We perform a brief semantic search to find cross-session relevance
    // Note: turns are newest-first, so turns[0] is the most recent turn.
    const lastUserText = turns[0]?.input.userText || "";
    if (lastUserText) {
      const { MemoryStore } = await import("./memoryStore.js");
      const memories = await MemoryStore.recall(sessionId, lastUserText);
      if (memories.length > 0) {
        history.push({
          role: "user",
          parts: [{ text: `[LONG-TERM SYSTEM RECALL]: The following are relevant insights from your past interactions across all sessions. Use this for continuity: ${memories.join(" | ")}` }]
        });
        history.push({
          role: "model",
          parts: [{ text: "Understood. I have integrated those past insights into my current reasoning state." }]
        });
      }
    }

    if (!turns.length) return history; // If no turns, return history which might contain semantic recall

    // Turns are returned newest-first from Firestore; reverse for chronological order
    const chronological = [...turns].reverse();

    // 2. Standard Session History
    for (const turn of chronological) {
      const userText =
        turn.input.audioTranscript ?? turn.input.userText ?? "";
      const modelText = turn.output.responseText ?? "";

      if (userText) {
        history.push({ role: "user", parts: [{ text: userText }] });
      }
      if (modelText) {
        history.push({ role: "model", parts: [{ text: modelText }] });
      }
    }
    return history;
  } catch {
    // If Firestore is unavailable, degrade gracefully
    return [];
  }
}
