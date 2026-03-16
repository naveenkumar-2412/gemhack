import { z } from "zod";
import { saveSessionTurn } from "./lib/firestore.js";
import type { AgentInput, AgentOutput, Mode } from "./types.js";
import { EngineRegistry } from "./core/EngineRegistry.js";
import { CacheManager } from "./lib/cacheManager.js";

// Extended input schema to support dynamic engine names and new fields
const InputSchema = z.object({
  mode: z.enum([
    "live-agent", "creative-storyteller", "ui-navigator",
    "code-analyzer", "financial-analyst", "health-diagnostic",
    "legal-scrutinizer", "data-scientist", "marketing-strategist",
    "security-auditor", "video-director", "roundtable-conference",
    "self-healing-coder"
  ]),
  sessionId: z.string().min(1),
  userText: z.string().optional(),
  screenshotBase64: z.string().optional(),
  imageMimeType: z.string().optional(),
  audioTranscript: z.string().optional(),
  locale: z.string().optional()
});

function applyGuardrails(input: AgentInput, output: AgentOutput): AgentOutput {
  const riskyIntentPattern =
    /(delete|remove|transfer|pay|purchase|submit|send|wire|checkout|confirm|deploy|drop|truncate|shutdown)/i;
  const userText = input.userText ?? "";
  const hasRiskyIntent = riskyIntentPattern.test(userText);
  const hasScreenshot = Boolean(input.screenshotBase64 && input.screenshotBase64.length > 100);

  if (input.mode !== "ui-navigator" && input.mode !== "security-auditor") {
    // Inject default safe guardrail for non-risky engines if not provided
    if (!output.guardrail) {
      output.guardrail = {
        level: "low",
        reason: "Standard informational response."
      };
    }
    return output;
  }

  // Risky UI intent logic
  if (input.mode === "ui-navigator") {
    if (hasRiskyIntent && !hasScreenshot) {
      output.confidence = Math.min(output.confidence, 0.45);
      output.warnings = [...(output.warnings ?? []), "High-risk UI intent without visual grounding."];
      output.guardrail = {
        level: "high",
        reason: "Intent appears high-impact but no screenshot grounding was provided."
      };
      return output;
    }

    if (hasRiskyIntent) {
      output.guardrail = {
        level: "medium",
        reason: "Intent appears high-impact and should be confirmed."
      };
      return output;
    }

    if (!hasScreenshot) {
      output.guardrail = {
        level: "medium",
        reason: "UI plan generated without screenshot context."
      };
      return output;
    }
  }

  return output;
}

export async function runAgent(raw: unknown): Promise<AgentOutput> {
  const input = InputSchema.parse(raw) as AgentInput;
  const mode = input.mode;
  const sessionId = input.sessionId;

  // Preserve explicit mode selection by default; only expand routing for roundtable mode.
  let activeModes: Mode[] = [mode];
  if ((input.userText || input.audioTranscript) && mode === "roundtable-conference") {
    const { CognitiveRouter } = await import("./core/CognitiveRouter.js");
    activeModes = await CognitiveRouter.route(input);
  }

  // Initial merged output
  let consolidatedOutput: AgentOutput = {
    responseText: "",
    confidence: 1,
    mode: activeModes[0],
    warnings: [],
    evidence: [],
    actions: [],
    media: []
  };

  for (const currentMode of activeModes) {
    console.log(`[Cognitive Pipeline] Executing Engine: ${currentMode}...`);
    
    // Enterprise Cache Check (using specific mode)
    const cacheKey = CacheManager.generateKey(currentMode, input.userText || input.audioTranscript || "", sessionId);
    const cached = CacheManager.get(cacheKey);
    
    let currentOutput: AgentOutput;
    if (cached) {
      currentOutput = cached;
    } else {
      const handler = EngineRegistry.getHandler(currentMode);
      if (!handler) continue;
      currentOutput = await handler({ ...input, mode: currentMode });
      CacheManager.set(cacheKey, currentOutput);
    }

    // Merge logic
    consolidatedOutput.responseText += (consolidatedOutput.responseText ? "\n\n---\n\n" : "") + currentOutput.responseText;
    consolidatedOutput.confidence = Math.min(consolidatedOutput.confidence, currentOutput.confidence);
    consolidatedOutput.warnings = [...(consolidatedOutput.warnings || []), ...(currentOutput.warnings || [])];
    consolidatedOutput.evidence = [...(consolidatedOutput.evidence || []), ...(currentOutput.evidence || [])];
    consolidatedOutput.actions = [...(consolidatedOutput.actions || []), ...(currentOutput.actions || [])];
    consolidatedOutput.media = [...(consolidatedOutput.media || []), ...(currentOutput.media || [])];

    if (currentOutput.rationale) {
      consolidatedOutput.rationale = consolidatedOutput.rationale
        ? `${consolidatedOutput.rationale} ${currentOutput.rationale}`
        : currentOutput.rationale;
    }

    if (currentOutput.guardrail) {
      consolidatedOutput.guardrail = currentOutput.guardrail;
    }
    
    if (currentOutput.metadata) {
      consolidatedOutput.metadata = { ...(consolidatedOutput.metadata || {}), ...currentOutput.metadata };
    }
  }

  const guardedOutput = applyGuardrails(input, consolidatedOutput);

  // Enterprise telemetry and session persisting
  if (guardedOutput.responseText && (input.userText || input.audioTranscript)) {
    // Commit to long-term semantic memory
    const { MemoryStore } = await import("./lib/memoryStore.js");
    MemoryStore.commit(input, guardedOutput).catch(e => {
        console.error("[MemoryStore] failed to commit:", e);
    });

    saveSessionTurn(input, guardedOutput).catch(e => {
      console.error("[Enterprise/Firestore] failed to save turn:", e);
    });
  }

  return guardedOutput;
}
