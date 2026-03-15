export type Mode =
  | "live-agent"
  | "creative-storyteller"
  | "ui-navigator"
  | "code-analyzer"
  | "financial-analyst"
  | "health-diagnostic"
  | "legal-scrutinizer"
  | "data-scientist"
  | "marketing-strategist"
  | "security-auditor"
  | "video-director"
  | "roundtable-conference"
  | "self-healing-coder";

export interface AgentInput {
  mode: Mode;
  sessionId: string;
  userText?: string;
  screenshotBase64?: string;
  imageMimeType?: string;
  audioTranscript?: string;
  locale?: string;
}

export interface StorySection {
  kind: "text" | "image" | "audio" | "video";
  content: string;
}

export interface ActionStep {
  action: "inspect" | "click" | "type" | "scroll" | "wait" | "assert";
  target?: string;
  value?: string;
  description?: string;
}

export interface LiveTurn {
  role: "user" | "model";
  text: string;
  timestamp: number;
}

export interface AgentOutput {
  mode: Mode;
  responseText: string;
  confidence: number;
  rationale?: string;
  evidence?: Array<{ source: string; detail: string }>;
  guardrail?: {
    level: "low" | "medium" | "high";
    reason: string;
    recommendedAction?: string;
    requiresConfirmation?: boolean;
  };
  actions?: ActionStep[];
  media?: StorySection[];
  warnings?: string[];
  metadata?: Record<string, any>;
}
