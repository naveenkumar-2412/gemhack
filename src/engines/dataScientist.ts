import { AgentInput, AgentOutput } from "../types.js";
import { generateWithGemini } from "../lib/gemini.js";

export const dataScientistSystemInstruction = "You are a senior data scientist. Your analysis must be evidence-based, using Markdown tables for statistical values. Focus on p-values, correlation, and model confidence.";

export function buildDataSciencePrompt(input: AgentInput) {
  const simulatedPValue = (Math.random() * 0.05).toFixed(4);
  const simulatedCorrelation = (Math.random() * 0.4 + 0.5).toFixed(2);
  const simulatedConfidence = Math.floor(Math.random() * 15 + 80);

  const prompt = `
    Analyze this dataset/hypothesis: ${input.userText}
    
    STATISTICAL WORKBENCH SIMULATION:
    - P-VALUE: ${simulatedPValue}
    - CORRELATION: ${simulatedCorrelation}
    - CONFIDENCE: ${simulatedConfidence}%
    
    Respond with:
    1. HYPOTHESIS TEST: TABLE showing the simulated metrics vs significance thresholds.
    2. CORRELATION MAP: Interpretation of the relationship strength.
    3. PREDICTIVE VALIDITY: 3-step recommendation for model tuning.
  `;

  return { prompt, pValue: simulatedPValue, correlation: simulatedCorrelation, confidence: simulatedConfidence };
}

export async function runDataScientist(input: AgentInput): Promise<AgentOutput> {
  const { prompt, pValue, correlation, confidence } = buildDataSciencePrompt(input);

  const response = await generateWithGemini({
    systemInstruction: dataScientistSystemInstruction,
    userPrompt: prompt
  });

  return {
    mode: "data-scientist",
    responseText: response,
    confidence: 0.94,
    evidence: [
      { source: "stat-workbench", detail: `Simulated P-Value: ${pValue}.` },
      { source: "predict-engine", detail: `Correlation strength: ${correlation}.` }
    ],
    metadata: {
      pValue,
      correlation,
      modelConfidence: confidence
    }
  };
}
