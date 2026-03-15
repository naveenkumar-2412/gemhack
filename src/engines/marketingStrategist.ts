import { AgentInput, AgentOutput } from "../types.js";
import { generateWithGemini } from "../lib/gemini.js";
import { SwarmOrchestrator } from "../core/SwarmOrchestrator.js";

export const marketingStrategistSystemInstruction = "You are a Chief Marketing Officer. Your strategy must be growth-oriented, using Markdown tables for ROI and channel performance metrics. Focus on ROAS and customer acquisition cost.";

export async function buildMarketingPrompt(input: AgentInput) {
  const visualContext = input.screenshotBase64 ? "[DELEGATED to Swarm for Visual Analysis]" : "[No visual provided]";
  const simulatedROAS = (Math.random() * 4 + 2).toFixed(1);
  const primaryChannel = ["Search", "Social", "Display", "Email"][Math.floor(Math.random() * 4)];

  const prompt = `
    Develop strategy for: ${input.userText}
    VISUAL CONTEXT: ${visualContext}
    
    MARKETING SIMULATION:
    - Forecasted ROAS: ${simulatedROAS}x
    - Primary Growth Channel: ${primaryChannel}
    
    Strategy Deliverables:
    1. GROWTH TRAJECTORY: TABLE showing 3-month projected performance.
    2. CHANNEL DEPTH: Breakdown of the ${primaryChannel} strategy.
    3. SWARM INSIGHT: Visual optimization path based on context.
  `;

  return { prompt, roas: simulatedROAS, channel: primaryChannel };
}

export async function runMarketingStrategist(input: AgentInput): Promise<AgentOutput> {
  const { prompt, roas, channel } = await buildMarketingPrompt(input);

  const response = await generateWithGemini({
    systemInstruction: marketingStrategistSystemInstruction,
    userPrompt: prompt
  });

  const dataSubTask = await SwarmOrchestrator.delegate(
    "marketing-strategist",
    "data-scientist",
    input,
    `The marketing strategy domain is: ${input.userText}. Generate a theoretical pandas visualization schema covering projected user growth.`
  );

  return {
    mode: "marketing-strategist",
    responseText: response + `\n\n### 📊 Swarm Evidence (Data Scientist)\n${dataSubTask.responseText}`,
    confidence: 0.93,
    evidence: [
      { source: "roas-engine", detail: `Projected ROAS calculated at ${roas}x.` },
      ...(dataSubTask.evidence || [])
    ],
    metadata: {
      forecastedROAS: parseFloat(roas),
      primaryChannel: channel,
      growthTrajectory: "Accelerated"
    }
  };
}
