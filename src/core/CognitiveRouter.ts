import { AgentInput, Mode } from "../types.js";
import { generateWithGemini } from "../lib/gemini.js";
import { eventBus } from "../lib/eventBus.js";

/**
 * Autonomous Cognitive Router
 * Analyzes raw user intent and maps it to the optimal sequence of expert engines.
 */
export class CognitiveRouter {
  
  /**
   * Predicts the primary engine mode(s) based on the user's text.
   */
  static async route(input: AgentInput): Promise<Mode[]> {
    const userText = input.userText?.toLowerCase() || "";
    
    // Heuristic Fast-Path (Phase 1)
    const heuristicModes: Mode[] = [];
    if (userText.includes("analyze code") || userText.includes("refactor") || userText.includes("function")) heuristicModes.push("code-analyzer");
    if (userText.includes("budget") || userText.includes("investment") || userText.includes("portfolio")) heuristicModes.push("financial-analyst");
    if (userText.includes("legal") || userText.includes("contract") || userText.includes("nda")) heuristicModes.push("legal-scrutinizer");
    if (userText.includes("growth") || userText.includes("marketing") || userText.includes("campaign")) heuristicModes.push("marketing-strategist");
    
    if (heuristicModes.length > 1) return heuristicModes;

    // LLM-Driven Classification (Phase 2)
    let classification = "";
    try {
      classification = await generateWithGemini({
          systemInstruction: "You are a Cognitive Router. Classify the user intent into one or more of these TriSense engine modes: live-agent, creative-storyteller, code-analyzer, financial-analyst, health-diagnostic, legal-scrutinizer, data-scientist, marketing-strategist, security-auditor, video-director, self-healing-coder. If the request is complex, provide a comma-separated list. Reply ONLY with the mode ID(s).",
          userPrompt: `Intent: "${input.userText}"`
      });
    } catch (e) {
      console.warn("[Cognitive Router] Gemini classification failed, falling back.");
      classification = "live-agent";
    }

    const rawModes = classification.split(",").map(m => m.trim().toLowerCase());
    
    // Safety Guard: Ensure predicted modes are valid
    const validModes = [
      "live-agent", "creative-storyteller", "ui-navigator",
      "code-analyzer", "financial-analyst", "health-diagnostic",
      "legal-scrutinizer", "data-scientist", "marketing-strategist",
      "security-auditor", "video-director", "roundtable-conference",
      "self-healing-coder"
    ];

    const finalModes = rawModes
      .filter(m => validModes.includes(m))
      .map(m => m as Mode);

    if (finalModes.length === 0) finalModes.push("live-agent" as Mode);
    
    eventBus.publish({
      topic: "SWARM_ROUTING",
      message: `[Cognitive Router] Intent classified as: ${finalModes.join(", ")}`
    });

    return finalModes;
  }
}
