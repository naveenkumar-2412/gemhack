import { EnterpriseVectorDB } from "./vectorDatabase.js";
import { eventBus } from "./eventBus.js";
import { saveSessionTurn } from "./firestore.js";
import { AgentInput, AgentOutput } from "../types.js";

/**
 * Universal Semantic Memory Store
 * Bridges the gap between short-term session history and long-term vector intelligence.
 */
export class MemoryStore {
  
  /**
   * Recalls relevant semantic memories for a given user query.
   */
  static async recall(sessionId: string, query: string): Promise<string[]> {
    console.log(`[MemoryStore] Recalling semantic context for session ${sessionId}...`);
    
    // In a real implementation, we'd pull from a 'user-memories' index in Pinecone/Firestore
    const memories = await EnterpriseVectorDB.search(`Semantic Recall: ${query}`, 3);
    
    eventBus.publish({
      topic: "MEMORY_RECALL",
      message: `Recalled ${memories.length} semantic fragments for query: "${query.substring(0, 30)}..."`
    });

    return memories;
  }

  /**
   * Commits an interaction to long-term memory.
   */
  static async commit(input: AgentInput, output: AgentOutput): Promise<void> {
    if (!output.responseText || output.responseText.length < 50) return;

    const memorySnippet = `[${new Date().toISOString()}] Session: ${input.sessionId} | Mode: ${input.mode}\nUser: ${input.userText}\nAI: ${output.responseText.substring(0, 200)}...`;

    // Simulated committing to vector DB
    console.log(`[MemoryStore] Committing interaction to vector index...`);
    
    eventBus.publish({
      topic: "MEMORY_COMMIT",
      message: `Committed interaction from ${input.mode} to long-term semantic store.`
    });

    // In a real environment, we'd trigger an embedding job here.
  }
}
