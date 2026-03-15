import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/gemini.js", () => ({
  generateWithGemini: vi.fn().mockResolvedValue(
    "Story paragraph one.\nStory paragraph two.\nImage Prompt: A glowing futuristic cityscape.\nVoiceover: Welcome to tomorrow.\nVideo Shot List: Wide establishing shot → close-up → product reveal."
  ),
  generateWithGeminiStream: vi.fn()
}));
vi.mock("../src/lib/sessionContext.js", () => ({
  buildContextHistory: vi.fn().mockResolvedValue([])
}));
vi.mock("../src/lib/firestore.js", () => ({
  saveSessionTurn: vi.fn().mockResolvedValue(undefined),
  getSessionTurns: vi.fn().mockResolvedValue([])
}));

import { runCreativeStoryteller } from "../src/modes/storyteller.js";

describe("storyteller", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns structured media sections for all 4 kinds", async () => {
    const out = await runCreativeStoryteller({
      mode: "creative-storyteller",
      sessionId: "story-1",
      userText: "Create a teaser for an AI smartwatch launch"
    });
    expect(out.mode).toBe("creative-storyteller");
    expect(Array.isArray(out.media)).toBe(true);
    const kinds = (out.media ?? []).map((s) => s.kind);
    expect(kinds).toContain("text");
    expect(kinds).toContain("image");
    expect(kinds).toContain("audio");
    expect(kinds).toContain("video");
  });

  it("has confidence >= 0.7", async () => {
    const out = await runCreativeStoryteller({ mode: "creative-storyteller", sessionId: "story-2", userText: "A poem" });
    expect(out.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it("includes interleaved_output evidence", async () => {
    const out = await runCreativeStoryteller({ mode: "creative-storyteller", sessionId: "story-3", userText: "AI future" });
    expect(out.evidence?.some((e) => e.source === "interleaved_output")).toBe(true);
  });

  it("uses default prompt when userText is empty", async () => {
    const out = await runCreativeStoryteller({ mode: "creative-storyteller", sessionId: "story-4" });
    expect(out.mode).toBe("creative-storyteller");
    expect(out.responseText).toBeTruthy();
  });
});
