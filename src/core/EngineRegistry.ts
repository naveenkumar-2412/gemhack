import { AgentInput, AgentOutput } from "../types.js";
import { runLiveAgent } from "../modes/liveAgent.js";
import { runCreativeStoryteller } from "../modes/storyteller.js";
import { runUiNavigator } from "../modes/uiNavigator.js";

// Placeholder imports for the 8 new engines
import { runCodeAnalyzer } from "../engines/codeAnalyzer.js";
import { runFinancialAnalyst } from "../engines/financialAnalyst.js";
import { runHealthDiagnostic } from "../engines/healthDiagnostic.js";
import { runLegalScrutinizer } from "../engines/legalDocumentScrutinizer.js";
import { runDataScientist } from "../engines/dataScientist.js";
import { runMarketingStrategist } from "../engines/marketingStrategist.js";
import { runSecurityAuditor } from "../engines/securityAuditor.js";
import { runVideoDirector } from "../engines/videoDirector.js";
import { runRoundtableConference } from "../engines/roundtableOrchestrator.js";
import { runSelfHealingCoder } from "../engines/selfHealingCoder.js";
import { Mode } from "../types.js";

// Typed engine handler function
export type EngineHandler = (input: AgentInput) => Promise<AgentOutput>;

export class EngineRegistry {
  private static engines: Map<string, EngineHandler> = new Map();

  static init() {
    // Core modes
    this.register("live-agent", runLiveAgent);
    this.register("creative-storyteller", runCreativeStoryteller);
    this.register("ui-navigator", runUiNavigator);

    // Enterprise engines
    this.register("code-analyzer", runCodeAnalyzer);
    this.register("financial-analyst", runFinancialAnalyst);
    this.register("health-diagnostic", runHealthDiagnostic);
    this.register("legal-scrutinizer", runLegalScrutinizer);
    this.register("data-scientist", runDataScientist);
    this.register("marketing-strategist", runMarketingStrategist);
    this.register("security-auditor", runSecurityAuditor);
    this.register("video-director", runVideoDirector);
    this.register("roundtable-conference" as Mode, runRoundtableConference);
    this.register("self-healing-coder" as Mode, runSelfHealingCoder);
  }

  static register(modeId: string, handler: EngineHandler) {
    this.engines.set(modeId, handler);
  }

  static getHandler(modeId: string): EngineHandler | undefined {
    return this.engines.get(modeId);
  }

  static getAvailableModes(): string[] {
    return Array.from(this.engines.keys());
  }

  /**
   * Dynamically retrieves the specialized prompt logic for an engine.
   * used for SSE Streaming to ensure consistency with standard API.
   */
  static async getEnginePrompt(modeId: string, input: AgentInput): Promise<{ prompt: string; systemInstruction?: string }> {
    switch (modeId) {
      case "code-analyzer": {
        const { buildCodeMethodologyPrompt, codeAnalyzerSystemInstruction } = await import("../engines/codeAnalyzer.js");
        return { prompt: await buildCodeMethodologyPrompt(input), systemInstruction: codeAnalyzerSystemInstruction };
      }
      case "financial-analyst": {
        const { getFinancialContext, financialAnalystSystemInstruction } = await import("../engines/financialAnalyst.js");
        const { prompt } = await getFinancialContext(input);
        return { prompt, systemInstruction: financialAnalystSystemInstruction };
      }
      case "data-scientist": {
        const { buildDataSciencePrompt, dataScientistSystemInstruction } = await import("../engines/dataScientist.js");
        const { prompt } = buildDataSciencePrompt(input);
        return { prompt, systemInstruction: dataScientistSystemInstruction };
      }
      case "legal-scrutinizer": {
        const { buildLegalPrompt, legalScrutinizerSystemInstruction } = await import("../engines/legalDocumentScrutinizer.js");
        const { prompt } = buildLegalPrompt(input);
        return { prompt, systemInstruction: legalScrutinizerSystemInstruction };
      }
      case "marketing-strategist": {
        const { buildMarketingPrompt, marketingStrategistSystemInstruction } = await import("../engines/marketingStrategist.js");
        const { prompt } = await buildMarketingPrompt(input);
        return { prompt, systemInstruction: marketingStrategistSystemInstruction };
      }
      case "health-diagnostic": {
        const { buildHealthPrompt, healthDiagnosticSystemInstruction } = await import("../engines/healthDiagnostic.js");
        const { prompt } = buildHealthPrompt(input);
        return { prompt, systemInstruction: healthDiagnosticSystemInstruction };
      }
      case "security-auditor": {
        const { buildSecurityPrompt, securityAuditorSystemInstruction } = await import("../engines/securityAuditor.js");
        const { prompt } = buildSecurityPrompt(input);
        return { prompt, systemInstruction: securityAuditorSystemInstruction };
      }
      case "video-director": {
        const { buildVideoPrompt, videoDirectorSystemInstruction } = await import("../engines/videoDirector.js");
        const { prompt } = buildVideoPrompt(input);
        return { prompt, systemInstruction: videoDirectorSystemInstruction };
      }
      case "roundtable-conference": {
        const { buildRoundtablePrompt, roundtableSystemInstruction } = await import("../engines/roundtableOrchestrator.js");
        const { prompt } = await buildRoundtablePrompt(input);
        return { prompt, systemInstruction: roundtableSystemInstruction };
      }
      case "self-healing-coder": {
        const { buildSelfHealingPrompt, selfHealingCoderSystemInstruction } = await import("../engines/selfHealingCoder.js");
        const prompt = buildSelfHealingPrompt(input);
        return { prompt, systemInstruction: selfHealingCoderSystemInstruction };
      }
      case "ui-navigator": {
        const { buildUiNavigatorPrompt, uiNavigatorSystemInstruction } = await import("../modes/uiNavigator.js");
        const { prompt } = await buildUiNavigatorPrompt(input);
        return { prompt, systemInstruction: uiNavigatorSystemInstruction };
      }
      default:
        return { prompt: input.userText || "" };
    }
  }
}

// Auto-initialize on import
EngineRegistry.init();
