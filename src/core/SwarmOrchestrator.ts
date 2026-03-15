import { AgentInput, AgentOutput, Mode } from "../types.js";
import { EngineRegistry } from "./EngineRegistry.js";
import { eventBus } from "../lib/eventBus.js";

/**
 * Enterprise Swarm Orchestrator
 * Allows AI engines to autonomously spawn sub-tasks and consult other engines 
 * before returning a final compiled response to the user.
 */
export class SwarmOrchestrator {
  
  /**
   * Called by an engine (e.g., Code Analyzer) when it needs a sub-engine (e.g., Security Auditor)
   * to review or generate part of its payload.
   */
  static async delegate(
    sourceEngine: Mode,
    targetEngine: Mode,
    input: AgentInput,
    reason: string
  ): Promise<AgentOutput> {
    
    eventBus.publish({
      topic: "SWARM_ROUTING",
      message: `[DELEGATION] ${sourceEngine} -> ${targetEngine}. Reason: ${reason}`
    });

    console.log(`[Swarm Orchestrator] Delegation: ${sourceEngine} -> ${targetEngine}. Reason: ${reason}`);
    
    const handler = EngineRegistry.getHandler(targetEngine);
    if (!handler) {
      throw new Error(`[Swarm Error] Target engine ${targetEngine} not found in registry.`);
    }

    const payload: AgentInput = {
      ...input,
      mode: targetEngine,
      sessionId: `${input.sessionId}-swarm-${targetEngine}`,
      userText: reason
    };

    // Execute the sub-engine
    const subOutput = await handler(payload);
    
    // Tag the evidence so the UI knows this was a Swarm action
    const swarmEvidence = {
      source: "swarm-orchestrator",
      detail: `Autonomously delegated sub-task to ${targetEngine}.`
    };

    subOutput.evidence = [...(subOutput.evidence || []), swarmEvidence];
    
    return subOutput;
  }
}
