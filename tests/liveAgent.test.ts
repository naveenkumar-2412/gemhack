import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Gemini SDK and sessionContext before imports
vi.mock("../src/lib/gemini.js", () => ({
  generateWithGemini: vi.fn().mockResolvedValue("Live agent mock response. How can I help you further?"),
  generateWithGeminiStream: vi.fn()
}));
vi.mock("../src/lib/sessionContext.js", () => ({
  buildContextHistory: vi.fn().mockResolvedValue([
    { role: "user", parts: [{ text: "Hello" }] },
    { role: "model", parts: [{ text: "Hi there!" }] }
  ])
}));
vi.mock("../src/lib/firestore.js", () => ({
  saveSessionTurn: vi.fn().mockResolvedValue(undefined),
  getSessionTurns: vi.fn().mockResolvedValue([])
}));

import { runLiveAgent } from "../src/modes/liveAgent.js";
import { generateWithGemini } from "../src/lib/gemini.js";
import { buildContextHistory } from "../src/lib/sessionContext.js";

describe("liveAgent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a valid AgentOutput for transcript input", async () => {
    const out = await runLiveAgent({
      mode: "live-agent",
      sessionId: "test-live-1",
      userText: "Summarize quantum computing",
      audioTranscript: "Summarize quantum computing"
    });
    expect(out.mode).toBe("live-agent");
    expect(typeof out.responseText).toBe("string");
    expect(out.confidence).toBeGreaterThan(0.8);
    expect(out.evidence?.some((e) => e.source === "audio_transcript")).toBe(true);
  });

  it("loads session context history from Firestore", async () => {
    await runLiveAgent({ mode: "live-agent", sessionId: "ctx-test", userText: "Hi" });
    expect(buildContextHistory).toHaveBeenCalledWith("ctx-test", 6);
    expect(generateWithGemini).toHaveBeenCalledWith(
      expect.objectContaining({ history: expect.arrayContaining([expect.objectContaining({ role: "user" })]) })
    );
  });

  it("includes locale in system instruction when provided", async () => {
    await runLiveAgent({ mode: "live-agent", sessionId: "locale-test", userText: "Hello", locale: "hi-IN" });
    const call = (generateWithGemini as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.systemInstruction).toContain("hi-IN");
  });

  it("reduces confidence when no transcript provided", async () => {
    const out = await runLiveAgent({ mode: "live-agent", sessionId: "notrans", userText: "" });
    expect(out.confidence).toBeLessThan(0.7);
    expect(out.warnings?.length).toBeGreaterThan(0);
  });

  it("includes session_context evidence entry", async () => {
    const out = await runLiveAgent({ mode: "live-agent", sessionId: "ev-test", userText: "Hello" });
    expect(out.evidence?.some((e) => e.source === "session_context")).toBe(true);
  });
});
