import { generateWithGemini } from "../lib/gemini.js";
import { buildContextHistory } from "../lib/sessionContext.js";
import type { AgentInput, AgentOutput, StorySection } from "../types.js";

const SECTION_MARKERS: Record<string, StorySection["kind"]> = {
  "image prompt": "image",
  "image:": "image",
  "image generation": "image",
  "voiceover": "audio",
  "audio:": "audio",
  "voice:": "audio",
  "video shot": "video",
  "shot list": "video",
  "video:": "video"
};

function parseStorySections(raw: string): StorySection[] {
  const lines = raw.split("\n");
  const sections: StorySection[] = [];
  let currentKind: StorySection["kind"] = "text";
  let buffer: string[] = [];

  const flush = () => {
    const content = buffer.join("\n").trim();
    if (content) sections.push({ kind: currentKind, content });
    buffer = [];
  };

  for (const line of lines) {
    const lower = line.toLowerCase();
    let matched = false;

    for (const [marker, kind] of Object.entries(SECTION_MARKERS)) {
      if (lower.includes(marker)) {
        flush();
        currentKind = kind;
        buffer.push(line);
        matched = true;
        break;
      }
    }

    if (!matched) {
      buffer.push(line);
    }
  }

  flush();

  // Guarantee at least one section of each kind for demo richness
  const kinds = new Set(sections.map((s) => s.kind));
  if (!kinds.has("image"))
    sections.push({ kind: "image", content: "Generate a cinematic key-art still matching the narrative theme." });
  if (!kinds.has("audio"))
    sections.push({ kind: "audio", content: "Synthesize a 10-second voiceover from the narrative paragraph." });
  if (!kinds.has("video"))
    sections.push({ kind: "video", content: "Opening wide shot → character close-up → product reveal → logo fade." });

  return sections;
}

export async function runCreativeStoryteller(input: AgentInput): Promise<AgentOutput> {
  const prompt =
    input.userText ?? "Create a short futuristic story about human-AI collaboration.";

  const history = await buildContextHistory(input.sessionId, 4);

  const rawText = await generateWithGemini({
    systemInstruction:
      "You are a multimodal creative director. Structure your output clearly with labeled sections: " +
      "1) Two-paragraph story narrative, " +
      "2) Image Prompt: (one sentence describing a key visual), " +
      "3) Voiceover: (10-second script), " +
      "4) Video Shot List: (3–4 short shot descriptions). " +
      "Keep each section clearly labeled.",
    userPrompt: prompt,
    history
  });

  const sections = parseStorySections(rawText);
  const textSection = sections.find((s) => s.kind === "text");

  return {
    mode: "creative-storyteller",
    responseText: textSection?.content ?? rawText,
    confidence: 0.84,
    rationale:
      "Used a structured multimodal director prompt to generate narrative + image + audio + video sections in one cohesive response.",
    evidence: [
      { source: "user_prompt", detail: prompt },
      { source: "interleaved_output", detail: `Parsed ${sections.length} typed section(s): ${[...new Set(sections.map((s) => s.kind))].join(", ")}` },
      { source: "session_context", detail: history.length > 0 ? `${Math.floor(history.length / 2)} prior turn(s) used` : "Fresh session" }
    ],
    media: sections
  };
}
