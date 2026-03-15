import { AgentInput, AgentOutput } from "../types.js";
import { generateWithGemini } from "../lib/gemini.js";
import { executeInSandbox } from "../lib/vmSandbox.js";

export const selfHealingCoderSystemInstruction = "You are a pure Javascript generator. Output precisely the requested code. Do not use markdown blocks natively.";

export function buildSelfHealingPrompt(input: AgentInput) {
  return `Write pure javascript algorithm based on: ${input.userText}. Return ONLY the valid javascript code without markdown formatting or surrounding text.`;
}

export async function runSelfHealingCoder(input: AgentInput): Promise<AgentOutput> {
  let attempt = 1;
  const maxAttempts = 3;
  let currentPrompt = buildSelfHealingPrompt(input);
  
  let finalCode = "";
  let finalResult;
  let healingHistory: string[] = [];

  while (attempt <= maxAttempts) {
    const rawCodeRes = await generateWithGemini({
      systemInstruction: selfHealingCoderSystemInstruction,
      userPrompt: currentPrompt
    });
    
    const cleanCode = rawCodeRes.replace(/```javascript/gi, "").replace(/```/g, "").trim();
    finalCode = cleanCode;

    const result = await executeInSandbox(cleanCode);
    finalResult = result;

    if (result.success) {
      healingHistory.push(`[Attempt ${attempt}] Success! Executed in ${result.executionTimeMs}ms.`);
      break;
    } else {
      healingHistory.push(`[Attempt ${attempt}] FAILED. Sandboxed exception caught: ${result.error}`);
      currentPrompt = `The previous javascript code failed with error: ${result.error}\n\nHere was the code:\n${cleanCode}\n\nPlease fix the logic and reply exclusively with the corrected Javascript code.`;
      attempt++;
    }
  }

  const successStr = finalResult?.success ? `✅ Algorithm Verified & Executed` : `❌ Max Healing Retries Exceeded`;

  return {
    mode: "self-healing-coder" as any,
    responseText: `${successStr}\n\n### Self-Healing Telemetry\n${healingHistory.join("\n")}\n\n### Executed Output\n${finalResult?.output}\n\n### Final Synthesized Code\n\`\`\`javascript\n${finalCode}\n\`\`\``,
    confidence: finalResult?.success ? 0.99 : 0.3,
    evidence: [
      { source: "vm-sandbox", detail: `Code isolated and securely executed.` },
      { source: "autonomous-loop", detail: `Engine required ${attempt} iterations to finalize code.` }
    ]
  };
}
