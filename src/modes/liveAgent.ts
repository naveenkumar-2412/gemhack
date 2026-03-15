import { generateWithGemini } from "../lib/gemini.js";
import { buildContextHistory } from "../lib/sessionContext.js";
import { analyzeVoiceTranscript } from "../lib/audioAnalysis.js";
import type { AgentInput, AgentOutput } from "../types.js";

export async function runLiveAgent(input: AgentInput): Promise<AgentOutput> {
  const transcript = input.audioTranscript ?? input.userText ?? "";
  const localeNote = input.locale ? ` Respond in locale: ${input.locale}.` : "";

  const history = await buildContextHistory(input.sessionId, 6);

  let voiceContext = "";
  let sentimentTag = "Neutral (No audio)";
  if (transcript) {
    const sentiment = analyzeVoiceTranscript(transcript);
    sentimentTag = `${sentiment.detectedEmotion.toUpperCase()} (Pacing: ${sentiment.pacingScore}/10)`;
    voiceContext = `\\nUser Audio Sentiment: ${sentimentTag}\\nRecommended tone: ${sentiment.recommendation}\\n`;
  }

  const responseText = await generateWithGemini({
    systemInstruction:
      `You are a concise, interruption-tolerant live voice assistant. Keep answers short (1–3 sentences), ask at most one clarifying question, and include safety caveats when uncertain.${localeNote}${voiceContext}`,
    userPrompt: transcript || "Hello, how can you help me?",
    history
  });

  const hasTranscript = transcript.length > 0;
  const contextTurns = Math.floor(history.length / 2);

  return {
    mode: "live-agent",
    responseText,
    confidence: hasTranscript ? 0.88 : 0.55,
    rationale: hasTranscript
      ? `Responded using transcript + ${contextTurns} prior session turn(s) for context continuity.`
      : "No transcript provided; response confidence is reduced.",
    evidence: [
      {
        source: "audio_sentiment",
        detail: sentimentTag
      },
      {
        source: "audio_transcript",
        detail: hasTranscript
          ? `Transcript: "${transcript.slice(0, 120)}${transcript.length > 120 ? "…" : ""}"`
          : "Missing transcript"
      },
      {
        source: "session_context",
        detail: contextTurns > 0
          ? `Loaded ${contextTurns} prior turn(s) from Firestore as context history`
          : "No prior session turns (fresh session)"
      },
      {
        source: "policy",
        detail: `Interruption-tolerant, concise response style${localeNote}`
      }
    ],
    warnings: hasTranscript ? undefined : ["No user speech transcript was provided."],
    media: [
      { kind: "audio", content: "Use TTS on the client to speak this response in real time." }
    ]
  };
}
