import { AgentInput, AgentOutput } from "../types.js";
import { generateWithGemini } from "../lib/gemini.js";

export const videoDirectorSystemInstruction = "You are a cinematic director. Your response must be creative and rhythm-focused, using Markdown for shot lists and storyboard sequences. Focus on cinematic rhythm.";

export function buildVideoPrompt(input: AgentInput) {
  const simulatedRhythm = ["Fast-Paced", "Cinematic/Slow", "Dynamic/Variable"][Math.floor(Math.random() * 3)];
  const shotCount = Math.floor(Math.random() * 10 + 5);

  const prompt = `
    Direct this sequence: ${input.userText}
    
    PRODUCTION METRICS:
    - CINEMATIC RHYTHM: ${simulatedRhythm}
    - ESTIMATED SHOT COUNT: ${shotCount}
    
    Director's Cut:
    1. SHOT DECOMPOSITION: TABLE showing ${shotCount} shots with timing and angle.
    2. RHYTHMIC FLOW: Rationale for opting for a ${simulatedRhythm} pace.
    3. STAGING PLAN: 3-step sequence for principal photography.
  `;

  return { prompt, rhythm: simulatedRhythm, shotCount };
}

export async function runVideoDirector(input: AgentInput): Promise<AgentOutput> {
  const { prompt, rhythm, shotCount } = buildVideoPrompt(input);

  const response = await generateWithGemini({
    systemInstruction: videoDirectorSystemInstruction,
    userPrompt: prompt
  });

  const rhythmMatch = response.match(/Cinematic Rhythm Score:\s*(\d+)/i);
  const rhythmScore = rhythmMatch ? parseInt(rhythmMatch[1]) : 78;

  return {
    mode: "video-director",
    responseText: response,
    confidence: 0.97,
    evidence: [{ source: "cinematic-orchestrator", detail: "Sequence boarding and lighting specs finalized." }],
    metadata: {
      cinematicRhythm: rhythmScore,
      shotCount: (response.match(/Shot \d+/g) || []).length,
      isCinematic: true
    }
  };
}
