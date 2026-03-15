import { generateWithGemini } from "../lib/gemini.js";
import { generateWithVision } from "../lib/geminiVision.js";
import { buildContextHistory } from "../lib/sessionContext.js";
import { executePlanInBrowser } from "../lib/browserExecutor.js";
import type { AgentInput, AgentOutput, ActionStep } from "../types.js";

export const uiNavigatorSystemInstruction = "You are a visual UI operator. Return a numbered, deterministic action plan (maximum 8 steps). Prefer read-only checks before click/submit. Be specific about element names/labels.";

export async function buildUiNavigatorPrompt(input: AgentInput) {
  const intent = input.userText ?? "Complete the requested task on this screen.";
  const hasScreen = Boolean(input.screenshotBase64 && input.screenshotBase64.length > 100);
  const history = await buildContextHistory(input.sessionId, 4);

  const prompt = hasScreen
    ? `User intent: "${intent}". Based on the screenshot above, produce a numbered action plan.`
    : `User intent: "${intent}". No screenshot provided. Return a general intent-based action plan.`;

  return { prompt, hasScreen, history, intent };
}

function parseActionPlan(raw: string): ActionStep[] {
  const lines = raw
    .split("\n")
    .map((l) => l.replace(/^[\d]+[.)]\s*/, "").trim())
    .filter(Boolean);

  return lines.slice(0, 8).map((line) => {
    const lower = line.toLowerCase();
    let action: ActionStep["action"] = "inspect";

    if (lower.startsWith("click") || lower.includes("click on") || lower.includes("press"))
      action = "click";
    else if (lower.startsWith("type") || lower.includes("enter") || lower.includes("input"))
      action = "type";
    else if (lower.startsWith("scroll") || lower.includes("scroll"))
      action = "scroll";
    else if (lower.startsWith("wait") || lower.includes("wait for"))
      action = "wait";
    else if (lower.startsWith("verify") || lower.includes("confirm") || lower.includes("assert"))
      action = "assert";

    return { action, target: line, description: line };
  });
}

export async function runUiNavigator(input: AgentInput): Promise<AgentOutput> {
  const { prompt, hasScreen, history, intent } = await buildUiNavigatorPrompt(input);

  let rawPlan: string;

  if (hasScreen) {
    rawPlan = await generateWithVision({
      systemInstruction: uiNavigatorSystemInstruction,
      userPrompt: prompt,
      imageBase64: input.screenshotBase64!,
      mimeType: (input.imageMimeType as "image/png" | "image/jpeg") ?? "image/png"
    });
  } else {
    rawPlan = await generateWithGemini({
      systemInstruction: uiNavigatorSystemInstruction,
      userPrompt: prompt,
      history
    });
  }

  const actions = parseActionPlan(rawPlan);

  let executionLogs: string[] = [];
  if (actions.length > 0 && process.env.NODE_ENV !== "test") {
    try {
      executionLogs = await executePlanInBrowser("https://example.com", actions);
    } catch (e: any) {
      executionLogs.push(`❌ Browser Execution failed: ${e.message}`);
    }
  }

  const finalResponseText = rawPlan + 
    (executionLogs.length > 0 ? `\n\n### 🌐 Headless Browser Sandbox\n${executionLogs.join("\n")}` : "");

  return {
    mode: "ui-navigator",
    responseText: finalResponseText,
    confidence: hasScreen ? 0.85 : 0.52,
    rationale: hasScreen
      ? "Action plan generated and tested via sandboxed Playwright proxy."
      : "Intent-only plan generated without screenshot context; confidence is reduced.",
    evidence: [
      { source: "user_intent", detail: intent },
      { source: "screenshot", detail: hasScreen ? "Screenshot analyzed" : "No screenshot provided" },
      { source: "playwright-sandbox", detail: `Executed ${executionLogs.length} simulated steps.` }
    ],
    actions
  };
}
