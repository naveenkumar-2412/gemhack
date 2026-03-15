import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGemini, mockVision } = vi.hoisted(() => {
  return {
    mockGemini: vi.fn().mockResolvedValue("1. Inspect the login button\n2. Click the login button\n3. Type credentials in the username input\n4. Submit the form"),
    mockVision: vi.fn().mockResolvedValue("1. Inspect login form\n2. Click username field\n3. Type credentials\n4. Click submit")
  };
});

vi.mock("../src/lib/gemini.js", () => ({
  generateWithGemini: mockGemini,
  generateWithGeminiStream: vi.fn()
}));
vi.mock("../src/lib/geminiVision.js", () => ({
  generateWithVision: mockVision
}));
vi.mock("../src/lib/sessionContext.js", () => ({
  buildContextHistory: vi.fn().mockResolvedValue([])
}));
vi.mock("../src/lib/firestore.js", () => ({
  saveSessionTurn: vi.fn().mockResolvedValue(undefined),
  getSessionTurns: vi.fn().mockResolvedValue([])
}));

import { runUiNavigator } from "../src/modes/uiNavigator.js";

describe("uiNavigator", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls generateWithVision when screenshot is present", async () => {
    const fakeBase64 = "a".repeat(200);
    await runUiNavigator({
      mode: "ui-navigator",
      sessionId: "nav-vision-1",
      userText: "Click the login button",
      screenshotBase64: fakeBase64,
      imageMimeType: "image/png"
    });
    expect(mockVision).toHaveBeenCalledOnce();
    expect(mockGemini).not.toHaveBeenCalled();
  });

  it("calls generateWithGemini when no screenshot is present", async () => {
    await runUiNavigator({
      mode: "ui-navigator",
      sessionId: "nav-text-1",
      userText: "Open the profile menu"
    });
    expect(mockGemini).toHaveBeenCalledOnce();
    expect(mockVision).not.toHaveBeenCalled();
  });

  it("has higher confidence with screenshot than without", async () => {
    const withScreen = await runUiNavigator({
      mode: "ui-navigator", sessionId: "nav-cmp-1",
      userText: "Click button", screenshotBase64: "a".repeat(200)
    });
    const withoutScreen = await runUiNavigator({
      mode: "ui-navigator", sessionId: "nav-cmp-2",
      userText: "Click button"
    });
    expect(withScreen.confidence).toBeGreaterThan(withoutScreen.confidence);
  });

  it("returns parsed action steps", async () => {
    const out = await runUiNavigator({
      mode: "ui-navigator", sessionId: "nav-steps-1",
      userText: "Login to the portal"
    });
    expect(Array.isArray(out.actions)).toBe(true);
    expect((out.actions ?? []).length).toBeGreaterThan(0);
  });

  it("passes mimeType to geminiVision", async () => {
    await runUiNavigator({
      mode: "ui-navigator", sessionId: "nav-mime-1",
      userText: "Analyze this", screenshotBase64: "b".repeat(200), imageMimeType: "image/jpeg"
    });
    expect(mockVision).toHaveBeenCalledWith(expect.objectContaining({ mimeType: "image/jpeg" }));
  });
});
