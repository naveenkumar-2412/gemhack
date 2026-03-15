import { WebSocket } from "ws";

export interface GeminiLiveCallbacks {
  onTextDelta: (delta: string) => void;
  onAudioChunk: (chunkBase64: string, mimeType: string) => void;
  onTurnComplete?: () => void;
  onError: (message: string) => void;
  onClose?: () => void;
}

interface RelayOptions {
  apiKey: string;
  model: string;
  systemInstruction: string;
  callbacks: GeminiLiveCallbacks;
}

export class GeminiLiveRelay {
  private upstream: WebSocket | null = null;
  private connected = false;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly systemInstruction: string;
  private readonly callbacks: GeminiLiveCallbacks;

  constructor(options: RelayOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.systemInstruction = options.systemInstruction;
    this.callbacks = options.callbacks;
  }

  isConnected(): boolean {
    return this.connected && this.upstream?.readyState === WebSocket.OPEN;
  }

  async connect(): Promise<void> {
    if (this.isConnected()) {
      return;
    }

    const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${this.apiKey}`;

    await new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(url);
      this.upstream = socket;

      socket.on("open", () => {
        this.connected = true;

        socket.send(
          JSON.stringify({
            setup: {
              model: `models/${this.model}`,
              generationConfig: {
                responseModalities: ["AUDIO", "TEXT"]
              },
              systemInstruction: {
                parts: [{ text: this.systemInstruction }]
              }
            }
          })
        );

        resolve();
      });

      socket.on("message", (raw) => {
        try {
          const parsed = JSON.parse(raw.toString()) as Record<string, unknown>;
          this.handleUpstreamMessage(parsed);
        } catch (error) {
          this.callbacks.onError(error instanceof Error ? error.message : "Invalid upstream message");
        }
      });

      socket.on("close", () => {
        this.connected = false;
        this.callbacks.onClose?.();
      });

      socket.on("error", (error) => {
        const message = error instanceof Error ? error.message : "Gemini Live socket error";
        this.callbacks.onError(message);
        if (!this.connected) {
          reject(new Error(message));
        }
      });
    });
  }

  sendAudioChunk(chunkBase64: string, mimeType: string): void {
    if (!this.isConnected() || !this.upstream) {
      return;
    }

    this.upstream.send(
      JSON.stringify({
        realtimeInput: {
          mediaChunks: [
            {
              mimeType,
              data: chunkBase64
            }
          ]
        }
      })
    );
  }

  sendTranscriptText(text: string, turnComplete: boolean): void {
    if (!this.isConnected() || !this.upstream) {
      return;
    }

    if (!text.trim() && !turnComplete) {
      return;
    }

    this.upstream.send(
      JSON.stringify({
        clientContent: {
          turns: [
            {
              role: "user",
              parts: text.trim() ? [{ text }] : []
            }
          ],
          turnComplete
        }
      })
    );
  }

  endAudioTurn(): void {
    if (!this.isConnected() || !this.upstream) {
      return;
    }

    this.upstream.send(
      JSON.stringify({
        realtimeInput: {
          audioStreamEnd: true
        }
      })
    );
  }

  close(): void {
    if (this.upstream && this.upstream.readyState === WebSocket.OPEN) {
      this.upstream.close();
    }
    this.connected = false;
    this.upstream = null;
  }

  private handleUpstreamMessage(message: Record<string, unknown>): void {
    if (message.serverContent && typeof message.serverContent === "object") {
      const serverContent = message.serverContent as Record<string, unknown>;
      const modelTurn = serverContent.modelTurn as Record<string, unknown> | undefined;
      const parts = Array.isArray(modelTurn?.parts) ? (modelTurn?.parts as Array<Record<string, unknown>>) : [];

      for (const part of parts) {
        const text = typeof part.text === "string" ? part.text : "";
        if (text) {
          this.callbacks.onTextDelta(text);
        }

        const inlineData =
          (part.inlineData as Record<string, unknown> | undefined) ??
          (part.inline_data as Record<string, unknown> | undefined);

        if (inlineData) {
          const data = typeof inlineData.data === "string" ? inlineData.data : "";
          const mimeType = typeof inlineData.mimeType === "string" ? inlineData.mimeType : "audio/pcm;rate=24000";
          if (data) {
            this.callbacks.onAudioChunk(data, mimeType);
          }
        }
      }

      const turnComplete = serverContent.turnComplete;
      if (typeof turnComplete === "boolean" && turnComplete) {
        this.callbacks.onTurnComplete?.();
      }
    }

    const candidates = Array.isArray(message.candidates) ? (message.candidates as Array<Record<string, unknown>>) : [];
    for (const candidate of candidates) {
      const content = candidate.content as Record<string, unknown> | undefined;
      const parts = Array.isArray(content?.parts) ? (content?.parts as Array<Record<string, unknown>>) : [];
      for (const part of parts) {
        const text = typeof part.text === "string" ? part.text : "";
        if (text) {
          this.callbacks.onTextDelta(text);
        }
      }
    }
  }
}
