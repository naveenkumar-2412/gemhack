/**
 * Enterprise Audio Sentiment & Pacing Analyzer
 * In a real environment, this models raw PCM data. Here we analyze the text transcription
 * pacing and keywords to model the user's emotional state for the Live Voice Agent.
 */

export interface SentimentProfile {
  detectedEmotion: "neutral" | "frustrated" | "urgent" | "happy";
  pacingScore: number;
  recommendation: string;
}

export function analyzeVoiceTranscript(transcript: string): SentimentProfile {
  const lower = transcript.toLowerCase();
  
  let frustrationScore = 0;
  let urgencyScore = 0;
  let happyScore = 0;

  const frustratedKeywords = ["angry", "fail", "broken", "stop", "stupid", "idiot", "why won't", "fix"];
  const urgentKeywords = ["now", "asap", "emergency", "fast", "hurry", "quick"];
  const happyKeywords = ["great", "awesome", "perfect", "thanks", "love"];

  frustratedKeywords.forEach(kw => { if (lower.includes(kw)) frustrationScore += 2; });
  urgentKeywords.forEach(kw => { if (lower.includes(kw)) urgencyScore += 1.5; });
  happyKeywords.forEach(kw => { if (lower.includes(kw)) happyScore += 2; });

  const wordCount = transcript.split(/\s+/).length;
  // Simulated pacing: short fast sentences with urgent words = high pacing
  const pacingScore = Math.min(10, Math.max(1, (urgencyScore * 2) + (wordCount > 30 ? 2 : 5)));

  let detectedEmotion: SentimentProfile["detectedEmotion"] = "neutral";
  let recommendation = "Maintain conversational and helpful tone.";

  if (frustrationScore > urgencyScore && frustrationScore > happyScore && frustrationScore >= 2) {
    detectedEmotion = "frustrated";
    recommendation = "De-escalate. Use a calm, empathetic tone. Apologize for issues.";
  } else if (urgencyScore > frustrationScore && urgencyScore >= 1.5) {
    detectedEmotion = "urgent";
    recommendation = "Be extremely concise. Provide immediate, actionable answers over explanations.";
  } else if (happyScore > frustrationScore && happyScore >= 2) {
    detectedEmotion = "happy";
    recommendation = "Match the user's positive energy. Be encouraging.";
  }

  return {
    detectedEmotion,
    pacingScore,
    recommendation
  };
}
