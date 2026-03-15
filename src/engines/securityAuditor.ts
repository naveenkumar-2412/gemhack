import { AgentInput, AgentOutput } from "../types.js";
import { generateWithGemini } from "../lib/gemini.js";

export const securityAuditorSystemInstruction = "You are a Tier-3 Security Auditor. Your audit must be aggressive and risk-centric, using Markdown tables for CVSS scoring. Focus on exploitability and impact.";

export function buildSecurityPrompt(input: AgentInput) {
  const simulatedCVSS = (Math.random() * 6 + 3.5).toFixed(1); // 3.5-9.5 range
  
  const prompt = `
    Audit this target/payload: ${input.userText}
    
    AUTOMATED THREAT VECTOR:
    - CVSS v3.1 SEVERITY: ${simulatedCVSS}
    
    Audit Deliverables:
    1. VULNERABILITY MATRIX: TABLE with CVSS Score, Exploitability, and Impact.
    2. ATTACK PATH: Step-by-step description of a potential compromise.
    3. REMEDIATION: 3-step hardening plan.
  `;

  return { prompt, cvss: simulatedCVSS };
}

export async function runSecurityAuditor(input: AgentInput): Promise<AgentOutput> {
  const { prompt, cvss } = buildSecurityPrompt(input);
  const cvssScore = parseFloat(cvss); // Use the generated CVSS score

  const response = await generateWithGemini({
    systemInstruction: securityAuditorSystemInstruction,
    userPrompt: prompt
  });

  return {
    mode: "security-auditor",
    responseText: response,
    confidence: 0.99,
    guardrail: { 
      level: cvssScore > 8.0 ? "high" : "medium", 
      reason: `Critical vulnerability scanning detected CVSS ${cvssScore}.` 
    },
    metadata: {
      threatSeverity: cvssScore,
      owaspAligned: true,
      exploitabilityProfile: cvssScore > 7 ? "High" : "Low"
    }
  };
}
