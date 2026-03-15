import request from "supertest";
import { describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/gemini.js", () => ({
  generateWithGemini: vi.fn().mockResolvedValue("Streaming response chunk mock"),
  generateWithGeminiStream: async function* () {
    yield "Hello ";
    yield "from ";
    yield "stream!";
  }
}));
vi.mock("../src/lib/sessionContext.js", () => ({
  buildContextHistory: vi.fn().mockResolvedValue([])
}));
vi.mock("../src/lib/firestore.js", () => ({
  saveSessionTurn: vi.fn().mockResolvedValue(undefined),
  getSessionTurns: vi.fn().mockResolvedValue([])
}));

import { app } from "../src/server.js";

describe("SSE /api/stream", () => {
  it("sets Content-Type to text/event-stream", async () => {
    const res = await request(app)
      .post("/api/stream")
      .send({ mode: "live-agent", sessionId: "stream-test-1", userText: "Hello" })
      .buffer(true)
      .parse((res, callback) => {
        let data = "";
        res.on("data", (chunk: Buffer) => { data += chunk.toString(); });
        res.on("end", () => callback(null, data));
      });

    expect(res.headers["content-type"]).toContain("text/event-stream");
  });

  it("returns at least one data: line", async () => {
    const res = await request(app)
      .post("/api/stream")
      .send({ mode: "live-agent", sessionId: "stream-test-2", userText: "What is AI?" })
      .buffer(true)
      .parse((res, callback) => {
        let data = "";
        res.on("data", (chunk: Buffer) => { data += chunk.toString(); });
        res.on("end", () => callback(null, data));
      });

    const body = res.body as string;
    expect(body).toContain("data:");
  });

  it("returns a done event at the end", async () => {
    const res = await request(app)
      .post("/api/stream")
      .send({ mode: "creative-storyteller", sessionId: "stream-test-3", userText: "Tell me a story" })
      .buffer(true)
      .parse((res, callback) => {
        let data = "";
        res.on("data", (chunk: Buffer) => { data += chunk.toString(); });
        res.on("end", () => callback(null, data));
      });

    const body = res.body as string;
    expect(body).toContain('"type":"done"');
  });
});

describe("/api/modes", () => {
  it("returns all three modes", async () => {
    const res = await request(app).get("/api/modes");
    expect(res.status).toBe(200);
    const ids = res.body.modes.map((m: { id: string }) => m.id);
    expect(ids).toContain("live-agent");
    expect(ids).toContain("creative-storyteller");
    expect(ids).toContain("ui-navigator");
  });

  it("each mode has required fields", async () => {
    const res = await request(app).get("/api/modes");
    for (const mode of res.body.modes) {
      expect(mode.id).toBeTruthy();
      expect(mode.name).toBeTruthy();
      expect(Array.isArray(mode.inputs)).toBe(true);
      expect(Array.isArray(mode.outputs)).toBe(true);
    }
  });
});
