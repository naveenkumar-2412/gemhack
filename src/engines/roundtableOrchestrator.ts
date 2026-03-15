import { AgentInput, AgentOutput, Mode } from "../types.js";
import { EngineRegistry } from "../core/EngineRegistry.js";
import { generateWithGemini } from "../lib/gemini.js";

export const roundtableSystemInstruction = "You are the Executive Orchestrator. Review the following specialist reports regarding the user's inquiry. Provide a decisive 3-sentence executive summary that resolves any conflicting advice.";

export async function buildRoundtablePrompt(input: AgentInput) {
  const delegates: Mode[] = ["financial-analyst", "legal-scrutinizer", "marketing-strategist", "security-auditor"];
  
  const promises = delegates.map(async (mode) => {
    const handler = EngineRegistry.getHandler(mode);
    if (!handler) return { mode, text: `[SYSTEM ERROR] Failed to load ${mode}` };
    try {
      const result = await handler({ ...input, mode, sessionId: `${input.sessionId}-rt-${mode}` });
      return { mode, text: result.responseText };
    } catch (e: any) {
      return { mode, text: `[EXECUTION FAILURE] ${e.message}` };
    }
  });

  const roundtableResults = await Promise.all(promises);

  let rawLog = "";
  roundtableResults.forEach(res => {
    rawLog += `\n\n--- [${res.mode.toUpperCase()}] perspective ---\n${res.text}`;
  });

  const prompt = `USER QUERY: ${input.userText}\n\nSPECIALIST REPORTS:${rawLog}`;
  return { prompt, roundtableResults, rawLog };
}

export async function runRoundtableConference(input: AgentInput): Promise<AgentOutput> {
  const { prompt, roundtableResults, rawLog } = await buildRoundtablePrompt(input);

  const consensusText = await generateWithGemini({
    systemInstruction: roundtableSystemInstruction,
    userPrompt: prompt
  });

  let gridHtml = `<div class="roundtable-grid">`;
  roundtableResults.forEach(res => {
    const color = res.mode.includes("legal") ? "var(--accent-cyan)" :
                 res.mode.includes("financial") ? "var(--accent-purple)" :
                 res.mode.includes("marketing") ? "var(--accent-red)" : "var(--accent-green)";
                 
    gridHtml += `
      <div class="roundtable-quadrant">
        <h4 style="color:${color};margin-bottom:8px">🏛️ ${res.mode.toUpperCase()}</h4>
        <div>${res.text}</div>
      </div>
    `;
  });
  gridHtml += `</div>`;

  return {
    mode: "roundtable-conference" as any, 
    responseText: `${consensusText}\n\n${gridHtml}`,
    confidence: 0.96,
    evidence: [
      { source: "roundtable-orchestrator", detail: `Successfully parallelized queries to ${roundtableResults.length} executive engines.` }
    ]
  };
}
