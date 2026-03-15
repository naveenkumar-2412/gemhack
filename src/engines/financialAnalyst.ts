import { AgentInput, AgentOutput } from "../types.js";
import { generateWithGemini } from "../lib/gemini.js";
import { EnterpriseVectorDB } from "../lib/vectorDatabase.js";

export const financialAnalystSystemInstruction = "You are an elite quantitative analyst. Your response must be data-driven, using Markdown tables for all metrics. Do not provide financial advice. Focus on volatility and sentiment trends.";

export async function getFinancialContext(input: AgentInput) {
  const ragData = await EnterpriseVectorDB.search(input.userText || "");
  const simulatedVolatility = (Math.random() * 2.5 + 0.5).toFixed(2);
  const simulatedSentiment = Math.floor(Math.random() * 40 + 30); // 30-70 range
  
  const prompt = `
    INTENT: ${input.userText}
    RAG CONTEXT: ${ragData.join(" | ")}
    SIMULATED TICKER FEED: VOL=${simulatedVolatility}% | SENTIMENT=${simulatedSentiment}/100
    
    Provide an elite quantitative analysis. Include:
    1. MARKET PULSE: Table comparing current vs historical volatility.
    2. RISK VECTOR: Identify delta between user intent and market sentiment.
    3. CAPITAL PLAN: Structured 3-step recommendation.
  `;
  
  return { prompt, ragData, simulatedVolatility, simulatedSentiment };
}

export async function runFinancialAnalyst(input: AgentInput): Promise<AgentOutput> {
  const { prompt, ragData, simulatedVolatility, simulatedSentiment } = await getFinancialContext(input);

  const response = await generateWithGemini({
    systemInstruction: financialAnalystSystemInstruction,
    userPrompt: prompt
  });

  return {
    mode: "financial-analyst",
    responseText: response,
    confidence: 0.92,
    evidence: [
      { source: "vector-db", detail: `Injected ${ragData.length} historical market chunks.` },
      { source: "quant-simulator", detail: `Calculated volatility spike at ${simulatedVolatility}%.` }
    ],
    metadata: {
      marketSentiment: simulatedSentiment,
      volatilityProfile: simulatedVolatility,
      dataLevel: "Professional"
    }
  };
}
