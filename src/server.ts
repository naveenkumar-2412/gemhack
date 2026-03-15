import cors from "cors";
import express from "express";
import { createServer } from "http";
import { fileURLToPath } from "url";
import { WebSocketServer } from "ws";
import { config } from "./config.js";
import { runAgent } from "./agent.js";
import { GeminiLiveRelay } from "./lib/geminiLiveRelay.js";
import { getSessionTurns } from "./lib/firestore.js";
import { generateWithGeminiStream } from "./lib/gemini.js";
import { buildContextHistory } from "./lib/sessionContext.js";
import { requestLogger } from "./middleware/logger.js";
import { apiRateLimit, strictRateLimit } from "./middleware/rateLimit.js";
import { authLayer } from "./lib/authLayer.js";
import { EngineRegistry } from "./core/EngineRegistry.js";
import { eventBus } from "./lib/eventBus.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(requestLogger);
// Enterprise auth layer mounted globally, but permits /api/public traffic.
// Note: tests bypass strict auth unless configured.
app.use(authLayer);
app.use(express.static("public"));

/* ───────────────── helpers ───────────────── */

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

async function streamAgentResponse(socket: import("ws").WebSocket, responseText: string): Promise<void> {
  const words = responseText.split(/\s+/).filter(Boolean);
  for (const word of words) {
    socket.send(JSON.stringify({ type: "agent_partial", delta: `${word} ` }));
    await sleep(35);
  }
}

/* ───────────────── REST endpoints ───────────────── */

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "gemhack-multimodal-agent", timestamp: new Date().toISOString() });
});

/** Deep health: checks Gemini reachability + Firestore connectivity */
app.get("/api/health/deep", async (_req, res) => {
  const result: Record<string, string> = {};

  // Gemini probe
  try {
    const probe = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${config.geminiApiKey || "INVALID"}`,
      { signal: AbortSignal.timeout(5000) }
    );
    result.gemini = probe.ok ? "ok" : `degraded(${probe.status})`;
  } catch {
    result.gemini = config.geminiApiKey ? "unreachable" : "no-key";
  }

  // Firestore probe
  try {
    if (!config.projectId) {
      result.firestore = "not-configured";
    } else {
      const { Firestore } = await import("@google-cloud/firestore");
      const db = new Firestore({ projectId: config.projectId });
      await db.collection(config.firestoreCollection).limit(1).get();
      result.firestore = "ok";
    }
  } catch {
    result.firestore = "unreachable";
  }

  const allOk = Object.values(result).every((v) => v === "ok" || v === "no-key" || v === "not-configured");
  res.status(allOk ? 200 : 503).json({ ok: allOk, ...result, timestamp: new Date().toISOString() });
});

/** Mode capabilities metadata */
app.get("/api/modes", (_req, res) => {
  res.json({
    modes: [
      {
        id: "live-agent",
        name: "Live Agent",
        emoji: "🗣️",
        description: "Real-time, interruption-friendly voice assistance",
        inputs: ["text", "audio_transcript", "locale"],
        outputs: ["responseText", "audio_tts"],
        supportsStreaming: true
      },
      {
        id: "creative-storyteller",
        name: "Creative Storyteller",
        emoji: "✍️",
        description: "Interleaved narrative + image/audio/video in one response",
        inputs: ["text"],
        outputs: ["text", "image_prompt", "voiceover", "video_shots"],
        supportsStreaming: true
      },
      {
        id: "ui-navigator",
        name: "UI Navigator",
        emoji: "☸️",
        description: "Screenshot-based intent-to-action planning",
        inputs: ["text", "screenshotBase64"],
        outputs: ["actions", "confidence", "guardrail"],
        supportsStreaming: false
      }
    ]
  });
});

/** Return full engine list dynamically */
app.get("/api/engines", (_req, res) => {
  res.json({ engines: EngineRegistry.getAvailableModes() });
});

/** Main agent endpoint */
app.post("/api/agent", apiRateLimit, async (req, res) => {
  try {
    const output = await withTimeout(runAgent(req.body), config.agentTimeoutMs, "Agent request timed out");
    res.json(output);
  } catch (error) {
    console.error("[SERVER Error /api/agent]", error);
    res.status(400).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

/** SSE streaming endpoint */
app.post("/api/stream", strictRateLimit, async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const sendEvent = (data: Record<string, unknown>) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const body = req.body as Record<string, unknown>;
    const initialMode = (body.mode as any) ?? "live-agent";
    const userText = String(body.userText ?? body.audioTranscript ?? "");
    const sessionId = String(body.sessionId ?? "stream-session");

    // 1. Resolve Autonomous Mode(s) (Phase 35)
    const { CognitiveRouter } = await import("./core/CognitiveRouter.js");
    const resolvedModes = await CognitiveRouter.route({ mode: initialMode as any, sessionId, userText });
    const primaryMode = resolvedModes[0];
    
    sendEvent({ type: "routing", mode: primaryMode, allModes: resolvedModes });

    const history = await buildContextHistory(sessionId, 4);
    const { prompt: userPrompt, systemInstruction } = await EngineRegistry.getEnginePrompt(primaryMode, {
       mode: primaryMode as any,
       userText,
       sessionId
    });

    let fullText = "";
    const stream = generateWithGeminiStream({ 
      systemInstruction: systemInstruction || "You are a helpful assistant.", 
      userPrompt, 
      history 
    });

    for await (const chunk of stream) {
      fullText += chunk;
      sendEvent({ type: "chunk", delta: chunk });
    }

    sendEvent({ type: "done", fullText });
  } catch (error) {
    console.error("[SERVER Error /api/stream]", error);
    sendEvent({ type: "error", error: error instanceof Error ? error.message : "Stream failed" });
  } finally {
    res.end();
  }
});

/** Swarm Observability Hub (Phase 36) */
app.get("/api/swarm/telemetry", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive"
  });

  const onEvent = (payload: any) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  eventBus.on("telemetry", onEvent);
  req.on("close", () => {
    eventBus.off("telemetry", onEvent);
  });
});

/** Session history endpoint */
app.get("/api/session/:sessionId", apiRateLimit, async (req, res) => {
  try {
    const sessionId = Array.isArray(req.params.sessionId) ? req.params.sessionId[0] : req.params.sessionId;
    const limitRaw = typeof req.query.limit === 'string' ? Number(req.query.limit) : 10;
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 10;
    const turns = await withTimeout(getSessionTurns(sessionId, limit), config.agentTimeoutMs, "Session history timed out");
    res.json({ sessionId, turns });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

/* ───────────────── WebSocket ───────────────── */

const server = createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

type LiveTurnPhase = "idle" | "listening" | "generating" | "completed" | "cancelled" | "error";

const liveRetryOptions = {
  attempts: 3,
  baseDelayMs: 250,
  maxDelayMs: 2000
};

wss.on("connection", (socket) => {
  const liveState = {
    sessionId: "",
    mode: "live-agent",
    phase: "idle" as LiveTurnPhase,
    audioChunks: 0,
    transcriptParts: [] as string[],
    liveTextBuffer: "",
    liveAudioChunks: 0,
    liveTurnComplete: false,
    usingGeminiLive: false
  };

  let relay: GeminiLiveRelay | null = null;

  const setPhase = (phase: LiveTurnPhase): void => {
    liveState.phase = phase;
    socket.send(JSON.stringify({ type: "live_state", phase }));
  };

  const resetTurnBuffers = (): void => {
    liveState.audioChunks = 0;
    liveState.transcriptParts = [];
    liveState.liveTextBuffer = "";
    liveState.liveAudioChunks = 0;
    liveState.liveTurnComplete = false;
  };

  socket.send(JSON.stringify({ type: "ready", message: "WebSocket connected." }));

  socket.on("message", async (rawMessage) => {
    try {
      const data = JSON.parse(rawMessage.toString()) as Record<string, unknown>;
      const messageType = typeof data.type === "string" ? data.type : "agent_request";

      if (messageType === "live_session_start") {
        liveState.sessionId = String(data.sessionId ?? "");
        liveState.mode = String(data.mode ?? "live-agent");
        resetTurnBuffers();
        liveState.usingGeminiLive = false;
        setPhase("listening");

        relay?.close();
        relay = null;

        if (config.geminiLiveEnabled && config.geminiApiKey) {
          relay = new GeminiLiveRelay({
            apiKey: config.geminiApiKey,
            model: config.geminiLiveModel,
            systemInstruction:
              "You are a real-time voice assistant. Keep answers concise, natural, and interruption-friendly.",
            callbacks: {
              onTextDelta: (delta) => {
                liveState.liveTextBuffer += delta;
                socket.send(JSON.stringify({ type: "agent_partial", delta }));
              },
              onAudioChunk: (chunkBase64, mimeType) => {
                liveState.liveAudioChunks += 1;
                socket.send(JSON.stringify({ type: "agent_audio_chunk", mimeType, chunkBase64 }));
              },
              onTurnComplete: () => { liveState.liveTurnComplete = true; },
              onError: (message) => {
                socket.send(JSON.stringify({ type: "live_ack", status: "live-error", error: message }));
              },
              onClose: () => {
                socket.send(JSON.stringify({ type: "live_ack", status: "upstream-closed" }));
              }
            }
          });

          try {
            await relay.connect();
            liveState.usingGeminiLive = true;
          } catch (error) {
            liveState.usingGeminiLive = false;
            relay = null;
            socket.send(JSON.stringify({
              type: "live_ack",
              status: "live-unavailable",
              error: error instanceof Error ? error.message : "Gemini Live connection failed"
            }));
          }
        }

        socket.send(JSON.stringify({
          type: "live_ack",
          status: "started",
          audioChunks: 0,
          usingGeminiLive: liveState.usingGeminiLive
        }));
        return;
      }

      if (messageType === "live_audio_chunk") {
        if (liveState.phase !== "listening") {
          socket.send(JSON.stringify({ type: "live_ack", status: "ignored-audio", phase: liveState.phase }));
          return;
        }

        liveState.audioChunks += 1;
        const chunkBase64 = String(data.chunkBase64 ?? "");
        const mimeType = String(data.mimeType ?? "audio/webm");

        if (relay && liveState.usingGeminiLive && chunkBase64) {
          relay.sendAudioChunk(chunkBase64, mimeType);
        }
        if (liveState.audioChunks % 3 === 0) {
          socket.send(JSON.stringify({ type: "live_ack", status: "streaming", audioChunks: liveState.audioChunks }));
        }
        return;
      }

      if (messageType === "live_transcript_partial") return;

      if (messageType === "live_transcript_final") {
        if (liveState.phase !== "listening") {
          return;
        }

        const text = String(data.text ?? "").trim();
        if (text) {
          liveState.transcriptParts.push(text);
          if (relay && liveState.usingGeminiLive) {
            relay.sendTranscriptText(text, false);
          }
        }
        return;
      }

      if (messageType === "live_session_end") {
        if (liveState.phase === "cancelled") {
          socket.send(JSON.stringify({ type: "live_ack", status: "ended-after-cancel", audioChunks: liveState.audioChunks }));
          return;
        }

        if (relay && liveState.usingGeminiLive) {
          relay.endAudioTurn();
        }
        socket.send(JSON.stringify({ type: "live_ack", status: "ended", audioChunks: liveState.audioChunks }));
        return;
      }

      if (messageType === "live_cancel") {
        setPhase("cancelled");
        relay?.close();
        relay = null;
        liveState.usingGeminiLive = false;
        resetTurnBuffers();
        socket.send(JSON.stringify({ type: "live_ack", status: "cancelled" }));
        return;
      }

      if (messageType === "live_generate") {
        if (liveState.phase === "cancelled") {
          socket.send(JSON.stringify({ type: "live_ack", status: "generate-blocked-cancelled" }));
          return;
        }

        setPhase("generating");
        const stitchedTranscript = [...liveState.transcriptParts, String(data.audioTranscript ?? "")]
          .join(" ").trim();

        if (relay && liveState.usingGeminiLive) {
          relay.sendTranscriptText(String(data.userText ?? stitchedTranscript), true);

          await sleep(1800);

          if (liveState.liveTextBuffer.trim() || liveState.liveAudioChunks > 0) {
            const output = {
              mode: "live-agent" as const,
              responseText: liveState.liveTextBuffer.trim() || "Live audio response generated.",
              confidence: 0.9,
              media: [{ kind: "audio" as const, content: `Streamed ${liveState.liveAudioChunks} audio chunks from Gemini Live.` }],
              warnings: liveState.liveTurnComplete ? undefined : ["Live response may still be streaming."]
            };
            socket.send(JSON.stringify({ type: "agent_final", output }));
            setPhase("completed");
            return;
          }
        }

        const output = await withTimeout(
          runAgent({
            mode: "live-agent",
            sessionId: String(data.sessionId ?? liveState.sessionId ?? "live-session"),
            userText: String(data.userText ?? stitchedTranscript),
            audioTranscript: stitchedTranscript
          }),
          config.agentTimeoutMs,
          "Agent websocket request timed out"
        );

        await streamAgentResponse(socket, output.responseText);
        socket.send(JSON.stringify({ type: "agent_final", output }));
        setPhase("completed");
        return;
      }

      const output = await withTimeout(runAgent(data), config.agentTimeoutMs, "Agent websocket request timed out");
      socket.send(JSON.stringify({ type: "agent", output }));
    } catch (error) {
      setPhase("error");
      socket.send(JSON.stringify({ type: "error", error: error instanceof Error ? error.message : "Unknown error" }));
    }
  });

  // === Phase 17: Enterprise Event Bus SSE Stream ===
  app.get("/api/telemetry", (req, res) => {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    });

    const onTelemetry = (payload: any) => {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    eventBus.on("telemetry", onTelemetry);

    req.on("close", () => {
      eventBus.off("telemetry", onTelemetry);
    });
  });

  socket.on("close", () => {
    relay?.close();
    relay = null;
  });
});

export { app };

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) {
  server.listen(config.port, () => {
    console.log(JSON.stringify({ event: "server_start", port: config.port, time: new Date().toISOString() }));
  });
}
