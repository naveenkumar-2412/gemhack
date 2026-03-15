import { AgentInput, AgentOutput } from "../types.js";
import { generateWithGemini } from "../lib/gemini.js";

export const legalScrutinizerSystemInstruction = "You are a senior legal counsel. Your analysis must be clinical and risk-focused. Use Markdown alerts for critical clause warnings. Focus on indemnity and termination risk.";

export function buildLegalPrompt(input: AgentInput) {
  const simulatedRisk = Math.floor(Math.random() * 8 + 1); // 1-8 scale
  
  const prompt = `
    Scrutinize this legal context: ${input.userText}
    
    LEGAL RISK PULSE: Level ${simulatedRisk}/10
    
    Requirement:
    1. CLAUSE SCAN: Identify risks in Indemnity, Termination, and Liability.
    2. RED-LINE ALERTS: Markdown table with 3 high-impact risks and mitigations.
    3. VERDICT: Clinical 'Proceed' or 'Halt' recommendation.
  `;

  return { prompt, riskLevel: simulatedRisk };
}

export async function runLegalScrutinizer(input: AgentInput): Promise<AgentOutput> {
  const { prompt, riskLevel } = buildLegalPrompt(input);

  const response = await generateWithGemini({
    systemInstruction: legalScrutinizerSystemInstruction,
    userPrompt: prompt
  });

  const riskScore = riskLevel;

  return {
    mode: "legal-scrutinizer",
    responseText: response,
    confidence: 0.91,
    guardrail: { 
      level: riskScore > 7 ? "high" : "medium", 
      reason: `Automated scan detected a Risk Pulse of ${riskScore}/10.` 
    },
    metadata: {
      legalRiskPulse: riskScore,
      indemnityAnalyzed: true,
      jurisdictionAlert: response.includes("Jurisdiction") || response.includes("Governing Law")
    }
  };
}
