import { Firestore } from "@google-cloud/firestore";
import { config } from "../config.js";
import type { AgentInput, AgentOutput } from "../types.js";

export interface SessionTurn {
  createdAt: number;
  input: AgentInput;
  output: AgentOutput;
}

let firestore: Firestore | null = null;

function getClient(): Firestore | null {
  if (!config.projectId) {
    return null;
  }
  if (!firestore) {
    firestore = new Firestore({ projectId: config.projectId });
  }
  return firestore;
}

export async function saveSessionTurn(input: AgentInput, output: AgentOutput): Promise<void> {
  const client = getClient();
  if (!client) {
    return;
  }

  await client
    .collection(config.firestoreCollection)
    .doc(input.sessionId)
    .collection("turns")
    .add({
      createdAt: Date.now(),
      input,
      output
    });
}

export async function getSessionTurns(sessionId: string, limit = 10): Promise<SessionTurn[]> {
  const client = getClient();
  if (!client) {
    return [];
  }

  const snap = await client
    .collection(config.firestoreCollection)
    .doc(sessionId)
    .collection("turns")
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  return snap.docs.map((doc) => doc.data() as SessionTurn);
}
