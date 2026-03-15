/* ─────────────────────────────────────────────────
   TriSense Agent — app.js (ES Module)
   Handles: WebSocket, SSE, waveform, streaming UI,
            story cards, action steps, session history
   ───────────────────────────────────────────────── */

/* ── Constants ── */
const KIND_META = {
  text:  { icon: "📝", label: "Narrative" },
  image: { icon: "🖼️", label: "Image Prompt" },
  audio: { icon: "🔊", label: "Voiceover Script" },
  video: { icon: "🎬", label: "Video Shot List" }
};

const ACTION_ICONS = {
  inspect: "👁",
  click:   "🖱️",
  type:    "⌨️",
  scroll:  "↕️",
  wait:    "⏳",
  assert:  "✅"
};

/* ── State ── */
let ws = null;
let currentMode = "live-agent";
let sessionId = generateSessionId();
let mediaStream = null;
let mediaRecorder = null;
let audioContext = null;
let analyser = null;
let waveAnimId = null;
let screenshotBase64 = null;
let screenshotMime = "image/png";
let isStreaming = false;

/* ── DOM refs ── */
const statusDot    = document.getElementById("statusDot");
const statusLabel  = document.getElementById("statusLabel");
const tabs         = document.querySelectorAll(".mode-tab");
const tabIndicator = document.getElementById("tabIndicator");
const panels       = document.querySelectorAll(".mode-panel");

const btnMicStart   = document.getElementById("btnMicStart");
const btnMicStop    = document.getElementById("btnMicStop");
const liveText      = document.getElementById("liveText");
const localeSelect  = document.getElementById("localeSelect");
const btnLiveSend   = document.getElementById("btnLiveSend");

const storyText     = document.getElementById("storyText");
const btnStorySend  = document.getElementById("btnStorySend");

const navText        = document.getElementById("navText");
const screenshotInput = document.getElementById("screenshotInput");
const uploadFileName  = document.getElementById("uploadFileName");
const screenshotPreview = document.getElementById("screenshotPreview");
const btnNavSend    = document.getElementById("btnNavSend");

const sessionIdInput = document.getElementById("sessionId");
const btnNewSession  = document.getElementById("btnNewSession");

const confidenceBar  = document.getElementById("confidenceBar");
const confidencePct  = document.getElementById("confidencePct");
const guardrailBadge = document.getElementById("guardrailBadge");
const guardrailText  = document.getElementById("guardrailText");
const responseArea   = document.getElementById("responseArea");
const responsePlaceholder = document.getElementById("responsePlaceholder");
const streamText     = document.getElementById("streamText");
const storySections  = document.getElementById("storySections");
const actionSteps    = document.getElementById("actionSteps");
const groundingBody  = document.getElementById("groundingBody");
const waveformCanvas = document.getElementById("waveformCanvas");
const waveformLabel  = document.getElementById("waveformLabel");
const btnCopy        = document.getElementById("btnCopy");
const btnClear       = document.getElementById("btnClear");
const btnHistory     = document.getElementById("btnHistory");
const historyDrawer  = document.getElementById("historyDrawer");
const historyList    = document.getElementById("historyList");
const btnCloseHistory = document.getElementById("btnCloseHistory");

/* ── Init ── */
sessionIdInput.value = sessionId;
initWebSocket();
initTabs();
initMicButtons();
initScreenshotUpload();
initOutputButtons();
initSessionControls();

/* ─────────────── WebSocket ─────────────── */
function initWebSocket() {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  ws = new WebSocket(`${proto}://${location.host}/ws`);

  ws.addEventListener("open", () => {
    setStatus("connected", "Connected");
  });

  ws.addEventListener("close", () => {
    setStatus("error", "Disconnected — retrying…");
    setTimeout(initWebSocket, 3000);
  });

  ws.addEventListener("error", () => {
    setStatus("error", "Connection error");
  });

  ws.addEventListener("message", (evt) => {
    try {
      const msg = JSON.parse(evt.data);
      handleWsMessage(msg);
    } catch { /* ignore malformed */ }
  });
}

function handleWsMessage(msg) {
  if (msg.type === "agent_partial") {
    appendStreamWord(msg.delta);
    hidePlaceholder();
  }
  if (msg.type === "agent_final" || msg.type === "agent") {
    const out = msg.output ?? msg;
    renderOutput(out);
  }
  if (msg.type === "live_ack") {
    if (msg.status === "started") {
      waveformLabel.textContent = msg.usingGeminiLive ? "🔴 Live via Gemini" : "🎙️ Recording…";
    }
  }
  if (msg.type === "error") {
    setStatus("error", "Agent error");
    appendStreamWord(`⚠️ ${msg.error}`);
    hidePlaceholder();
    setStreaming(false);
  }
}

/* ─────────────── Tabs ─────────────── */
function initTabs() {
  updateIndicator(tabs[0]);
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => { t.classList.remove("active"); t.setAttribute("aria-selected", "false"); });
      panels.forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");
      currentMode = tab.dataset.mode;
      const panelId = tab.getAttribute("aria-controls");
      document.getElementById(panelId)?.classList.add("active");
      updateIndicator(tab);
      clearOutput();
    });
  });
}

function updateIndicator(activeTab) {
  const tabRect = activeTab.getBoundingClientRect();
  const navRect = activeTab.closest(".mode-tabs").getBoundingClientRect();
  tabIndicator.style.transform = `translateX(${tabRect.left - navRect.left - 6}px)`;
  tabIndicator.style.width = `${tabRect.width}px`;
}

/* ─────────────── Mic / Waveform ─────────────── */
function initMicButtons() {
  btnMicStart.addEventListener("click", startMic);
  btnMicStop.addEventListener("click", stopMicAndSend);
  btnLiveSend.addEventListener("click", () => sendAgentRequest("live-agent", {
    userText: liveText.value.trim(),
    audioTranscript: liveText.value.trim(),
    locale: localeSelect.value || undefined
  }));
  btnStorySend.addEventListener("click", () => sendAgentRequest("creative-storyteller", {
    userText: storyText.value.trim() || "Create a short futuristic story about human-AI collaboration."
  }));
  btnNavSend.addEventListener("click", () => sendAgentRequest("ui-navigator", {
    userText: navText.value.trim() || "Complete the task on screen.",
    screenshotBase64: screenshotBase64 ?? undefined,
    imageMimeType: screenshotMime
  }));
}

async function startMic() {
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    const src = audioContext.createMediaStreamSource(mediaStream);
    src.connect(analyser);

    mediaRecorder = new MediaRecorder(mediaStream);
    const chunks = [];
    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: "audio/webm" });
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(",")[1];
        ws?.send(JSON.stringify({ type: "live_audio_chunk", chunkBase64: base64, mimeType: "audio/webm" }));
        ws?.send(JSON.stringify({ type: "live_transcript_final", text: liveText.value.trim() }));
      };
      reader.readAsDataURL(blob);
    };

    mediaRecorder.start(500);
    ws?.send(JSON.stringify({ type: "live_session_start", sessionId, mode: "live-agent" }));

    btnMicStart.disabled = true;
    btnMicStop.disabled = false;
    waveformLabel.textContent = "🎙️ Recording…";
    drawWaveform();
  } catch (err) {
    alert("Mic access denied: " + err.message);
  }
}

function stopMicAndSend() {
  mediaRecorder?.stop();
  mediaStream?.getTracks().forEach((t) => t.stop());
  cancelAnimationFrame(waveAnimId);
  clearWaveform();

  btnMicStart.disabled = false;
  btnMicStop.disabled = true;
  waveformLabel.textContent = "Processing…";

  setStreaming(true);
  ws?.send(JSON.stringify({
    type: "live_generate",
    sessionId,
    userText: liveText.value.trim(),
    audioTranscript: liveText.value.trim()
  }));
}

function drawWaveform() {
  const ctx = waveformCanvas.getContext("2d");
  const buf = new Uint8Array(analyser.frequencyBinCount);

  function frame() {
    waveAnimId = requestAnimationFrame(frame);
    analyser.getByteTimeDomainData(buf);
    const W = waveformCanvas.width, H = waveformCanvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.beginPath();
    ctx.strokeStyle = "rgba(66,133,244,0.85)";
    ctx.lineWidth = 2;
    const step = W / buf.length;
    buf.forEach((v, i) => {
      const y = (v / 128 - 1) * (H / 2) + H / 2;
      i === 0 ? ctx.moveTo(0, y) : ctx.lineTo(i * step, y);
    });
    ctx.stroke();
  }
  frame();
}

function clearWaveform() {
  const ctx = waveformCanvas.getContext("2d");
  ctx.clearRect(0, 0, waveformCanvas.width, waveformCanvas.height);
  waveformLabel.textContent = "Mic inactive";
}

/* ─────────────── Screenshot Upload ─────────────── */
function initScreenshotUpload() {
  const uploadLabel = document.querySelector(".upload-label");
  uploadLabel?.addEventListener("click", () => screenshotInput.click());

  screenshotInput.addEventListener("change", () => {
    const file = screenshotInput.files[0];
    if (!file) return;
    screenshotMime = file.type || "image/png";
    uploadFileName.textContent = file.name;

    const reader = new FileReader();
    reader.onload = () => {
      screenshotBase64 = reader.result.split(",")[1];
      const img = document.createElement("img");
      img.src = reader.result;
      img.alt = "Screenshot preview";
      screenshotPreview.innerHTML = "";
      screenshotPreview.appendChild(img);
      screenshotPreview.classList.remove("hidden");
    };
    reader.readAsDataURL(file);
  });
}

/* ─────────────── REST/SSE Agent Request ─────────────── */
async function sendAgentRequest(mode, payload) {
  clearOutput();
  setStreaming(true);
  hidePlaceholder();

  const body = { mode, sessionId, ...payload };

  // Use SSE stream for live-agent and storyteller
  if (mode !== "ui-navigator") {
    try {
      const resp = await fetch("/api/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let fullJson = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        for (const line of text.split("\n")) {
          if (!line.startsWith("data:")) continue;
          try {
            const ev = JSON.parse(line.slice(5).trim());
            if (ev.type === "chunk") appendStreamWord(ev.delta);
            if (ev.type === "done") fullJson = ev.fullText ?? "";
            if (ev.type === "error") {
              appendStreamWord(`⚠️ ${ev.error}`);
            }
          } catch { /* skip */ }
        }
      }

      // After stream ends, call full agent for metadata
      const fullOut = await (await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      })).json();
      renderOutputMeta(fullOut);
      renderSections(fullOut);
      renderGrounding(fullOut);
    } catch (err) {
      appendStreamWord(`⚠️ Request failed: ${err.message}`);
    }
  } else {
    // UI Navigator: use REST endpoint for structured actions
    try {
      const resp = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const out = await resp.json();
      renderOutput(out);
    } catch (err) {
      appendStreamWord(`⚠️ Request failed: ${err.message}`);
    }
  }

  setStreaming(false);
  waveformLabel.textContent = "Mic inactive";
}

/* ─────────────── Render Output ─────────────── */
function renderOutput(out) {
  hidePlaceholder();
  streamText.textContent = out.responseText ?? "";
  renderOutputMeta(out);
  renderSections(out);
  renderGrounding(out);
  setStreaming(false);
}

function renderOutputMeta(out) {
  // Confidence bar
  const pct = Math.round((out.confidence ?? 0) * 100);
  confidenceBar.style.width = `${pct}%`;
  confidencePct.textContent = `${pct}%`;

  // Guardrail badge
  const level = out.guardrail?.level ?? "";
  guardrailBadge.dataset.level = level;
  guardrailText.textContent = level ? `⚠ ${level.toUpperCase()}` : "—";
  guardrailBadge.title = out.guardrail?.reason ?? "";
}

function renderSections(out) {
  storySections.innerHTML = "";
  actionSteps.innerHTML = "";

  if (out.mode === "creative-storyteller" && Array.isArray(out.media)) {
    out.media.forEach((section, i) => {
      const meta = KIND_META[section.kind] ?? { icon: "📄", label: section.kind };
      const card = document.createElement("div");
      card.className = "story-card";
      card.dataset.kind = section.kind;
      card.style.animationDelay = `${i * 80}ms`;
      card.innerHTML = `
        <div class="story-card-header">
          <span class="story-card-icon">${meta.icon}</span>
          <span class="story-card-label">${meta.label}</span>
        </div>
        <div class="story-card-content">${escapeHtml(section.content)}</div>
      `;
      storySections.appendChild(card);
    });
  }

  if (out.mode === "ui-navigator" && Array.isArray(out.actions) && out.actions.length > 0) {
    out.actions.forEach((step, i) => {
      const icon = ACTION_ICONS[step.action] ?? "▶️";
      const el = document.createElement("div");
      el.className = "action-step";
      el.style.animationDelay = `${i * 60}ms`;
      el.innerHTML = `
        <div class="step-number">${i + 1}</div>
        <span class="step-icon">${icon}</span>
        <span class="step-text">${escapeHtml(step.description ?? step.target ?? step.action)}</span>
      `;
      actionSteps.appendChild(el);
    });
  }
}

function renderGrounding(out) {
  const ev = out.evidence ?? [];
  if (!ev.length) { groundingBody.textContent = "No evidence."; return; }
  groundingBody.innerHTML = ev.map((e) => `
    <div class="evidence-item">
      <div class="evidence-source">${escapeHtml(e.source)}</div>
      <div class="evidence-detail">${escapeHtml(e.detail)}</div>
    </div>
  `).join("");
}

/* ─────────────── Streaming text helpers ─────────────── */
function appendStreamWord(text) {
  hidePlaceholder();
  // Split into sub-words and animate each
  text.split("").forEach((ch) => {
    const span = document.createElement("span");
    span.className = "stream-word";
    span.textContent = ch;
    streamText.appendChild(span);
  });
  responseArea.scrollTop = responseArea.scrollHeight;
}

function hidePlaceholder() {
  responsePlaceholder.style.display = "none";
}

function clearOutput() {
  streamText.textContent = "";
  storySections.innerHTML = "";
  actionSteps.innerHTML = "";
  groundingBody.textContent = "No evidence yet.";
  responsePlaceholder.style.display = "";
  confidenceBar.style.width = "0%";
  confidencePct.textContent = "—";
  guardrailBadge.dataset.level = "";
  guardrailText.textContent = "—";
}

/* ─────────────── Output buttons ─────────────── */
function initOutputButtons() {
  btnCopy.addEventListener("click", () => {
    const text = streamText.textContent;
    if (text) navigator.clipboard.writeText(text).then(() => { btnCopy.textContent = "✅"; setTimeout(() => { btnCopy.textContent = "📋"; }, 1500); });
  });

  btnClear.addEventListener("click", clearOutput);

  btnHistory.addEventListener("click", async () => {
    historyDrawer.classList.toggle("hidden");
    if (!historyDrawer.classList.contains("hidden")) {
      await loadHistory();
    }
  });

  btnCloseHistory.addEventListener("click", () => historyDrawer.classList.add("hidden"));
}

async function loadHistory() {
  historyList.innerHTML = "<div style='color:var(--text-muted);font-size:0.8rem'>Loading…</div>";
  try {
    const resp = await fetch(`/api/session/${encodeURIComponent(sessionId)}?limit=10`);
    const data = await resp.json();
    const turns = (data.turns ?? []).reverse();
    if (!turns.length) { historyList.innerHTML = "<div style='color:var(--text-muted);font-size:0.8rem'>No history for this session.</div>"; return; }
    historyList.innerHTML = turns.map((t) => `
      <div class="history-turn">
        <div class="history-turn-mode">${t.input?.mode ?? "unknown"}</div>
        <div class="history-turn-text">${escapeHtml((t.input?.userText ?? t.input?.audioTranscript ?? "").slice(0, 80))}</div>
      </div>
    `).join("");
  } catch {
    historyList.innerHTML = "<div style='color:var(--text-muted);font-size:0.8rem'>Could not load history.</div>";
  }
}

/* ─────────────── Session controls ─────────────── */
function initSessionControls() {
  sessionIdInput.addEventListener("input", () => { sessionId = sessionIdInput.value.trim() || generateSessionId(); });
  btnNewSession.addEventListener("click", () => {
    sessionId = generateSessionId();
    sessionIdInput.value = sessionId;
    clearOutput();
  });
}

/* ─────────────── Status ─────────────── */
function setStatus(state, label) {
  statusDot.className = `status-dot ${state === "connected" ? "connected" : state === "error" ? "error" : ""}`;
  statusLabel.textContent = label;
}

function setStreaming(active) {
  isStreaming = active;
  [btnLiveSend, btnStorySend, btnNavSend].forEach((b) => { if (b) b.disabled = active; });
}

/* ─────────────── Utilities ─────────────── */
function generateSessionId() {
  return `sess-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
