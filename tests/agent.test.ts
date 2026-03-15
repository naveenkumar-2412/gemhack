import { describe, expect, it } from "vitest";
import { runAgent } from "../src/agent.ts";

describe("runAgent", () => {
  it("handles live-agent mode", async () => {
    const output = await runAgent({
      mode: "live-agent",
      sessionId: "test-live",
      userText: "Summarize this in one line",
      audioTranscript: "Summarize this in one line"
    });

    expect(output.mode).toBe("live-agent");
    expect(typeof output.responseText).toBe("string");
    expect(output.confidence).toBeGreaterThan(0);
    expect(Array.isArray(output.evidence)).toBe(true);
  });

  it("handles creative-storyteller mode", async () => {
    const output = await runAgent({
      mode: "creative-storyteller",
      sessionId: "test-story",
      userText: "Create a short space opera teaser"
    });

    expect(output.mode).toBe("creative-storyteller");
    expect(output.media?.length).toBeGreaterThan(0);
    expect(output.rationale).toBeTruthy();
  });

  it("handles ui-navigator mode", async () => {
    const output = await runAgent({
      mode: "ui-navigator",
      sessionId: "test-ui",
      userText: "Click the login button"
    });

    expect(output.mode).toBe("ui-navigator");
    expect(output.actions?.length).toBeGreaterThan(0);
    expect(output.evidence?.find((item) => item.source === "screenshot")).toBeTruthy();
    expect(output.guardrail?.level).toBeTruthy();
  });

  it("adds high guardrail for risky ui action without screenshot", async () => {
    const output = await runAgent({
      mode: "ui-navigator",
      sessionId: "test-ui-risk",
      userText: "Delete the production database now"
    });

    expect(output.mode).toBe("ui-navigator");
    expect(output.guardrail?.level).toBe("high");
  });
});
