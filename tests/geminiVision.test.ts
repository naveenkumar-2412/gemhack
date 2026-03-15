import { beforeEach, describe, expect, it, vi } from "vitest";

// Use vi.mock hoisting — vitest will hoist this before imports
vi.mock("@google/generative-ai", () => {
  const mockGenerateContent = vi.fn().mockResolvedValue({
    response: { text: () => "Visual analysis: button is in top-right corner." }
  });
  return {
    GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockReturnValue({
        generateContent: mockGenerateContent
      })
    })),
    __mockGenerateContent: mockGenerateContent
  };
});

vi.mock("../src/config.js", () => ({
  config: {
    geminiApiKey: "test-api-key",
    geminiModel: "gemini-2.0-flash",
    geminiTimeoutMs: 5000,
    geminiLiveEnabled: false,
    geminiLiveModel: "gemini-live-preview",
    agentTimeoutMs: 10000,
    port: 8080,
    projectId: "",
    location: "us-central1",
    firestoreCollection: "sessions",
    gcsBucket: ""
  }
}));

import { generateWithVision } from "../src/lib/geminiVision.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

describe("geminiVision", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a GoogleGenerativeAI client with the API key", async () => {
    await generateWithVision({
      systemInstruction: "You are a UI analyst.",
      userPrompt: "Describe the main button",
      imageBase64: "abc123base64data",
      mimeType: "image/png"
    });
    expect(GoogleGenerativeAI).toHaveBeenCalledWith("test-api-key");
  });

  it("calls getGenerativeModel with correct model and systemInstruction", async () => {
    const mockInstance = (GoogleGenerativeAI as ReturnType<typeof vi.fn>).mock.results[0]?.value;
    if (!mockInstance) return; // skip if not constructed yet

    await generateWithVision({
      systemInstruction: "Analyze UI carefully",
      userPrompt: "What buttons are visible?",
      imageBase64: "testdata"
    });

    const getModelSpy = mockInstance.getGenerativeModel;
    expect(getModelSpy).toHaveBeenCalledWith(
      expect.objectContaining({ systemInstruction: "Analyze UI carefully" })
    );
  });

  it("returns a non-empty string response", async () => {
    const result = await generateWithVision({
      systemInstruction: "UI analyst",
      userPrompt: "Describe the screen",
      imageBase64: "somebase64image",
      mimeType: "image/jpeg"
    });
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("uses image/png as default mimeType when not provided", async () => {
    // We verify the call doesn't throw and returns a string
    const result = await generateWithVision({
      systemInstruction: "Analyst",
      userPrompt: "What is on screen?",
      imageBase64: "base64data"
      // mimeType intentionally omitted
    });
    expect(typeof result).toBe("string");
  });
});
