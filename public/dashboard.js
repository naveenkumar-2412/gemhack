/* TriSense Enterprise OS - Client Application Logic */

const state = {
  activeEngine: "live-agent",
  sessionId: `ent-${Date.now()}`,
  isStreaming: false,
  base64File: null,
  mimeType: null,
  history: []
};

// === Phase 20: Dynamic Input Maps ===
const INPUT_CONFIG = {
  "live-agent": `
    <textarea id="dynamic-main" class="enterprise-input" placeholder="Type or speak a live command..." rows="4"></textarea>
  `,
  "financial-analyst": `
    <div style="display:flex; gap:10px; margin-bottom:10px">
      <input id="dyn-ticker" type="text" class="enterprise-input" placeholder="Ticker Symbol (e.g. AAPL)" style="flex:1">
      <input id="dyn-range" type="text" class="enterprise-input" placeholder="Timeframe (e.g. YTD)" style="flex:1">
    </div>
    <textarea id="dynamic-main" class="enterprise-input" placeholder="Describe the financial modeling request..." rows="3"></textarea>
  `,
  "health-diagnostic": `
    <input id="dyn-patient" type="text" class="enterprise-input" placeholder="Patient Vitals / Summary" style="margin-bottom:10px">
    <textarea id="dynamic-main" class="enterprise-input" placeholder="List observed symptoms..." rows="3"></textarea>
  `,
  "code-analyzer": `
    <input id="dyn-repo" type="text" class="enterprise-input" placeholder="GitHub Repository / Source Path" style="margin-bottom:10px">
    <textarea id="dynamic-main" class="enterprise-input" placeholder="Paste target code snippet or describe the architecture..." rows="3"></textarea>
  `,
  "marketing-strategist": `
    <input id="dyn-product" type="text" class="enterprise-input" placeholder="Product/Service Name" style="margin-bottom:10px">
    <textarea id="dynamic-main" class="enterprise-input" placeholder="Describe the target audience and campaign goals..." rows="3"></textarea>
  `,
  "roundtable-conference": `
    <div style="color:var(--accent-cyan); font-size:0.8rem; margin-bottom:8px">🏛️ Executive Topic (Streams to 4 Agents)</div>
    <textarea id="dynamic-main" class="enterprise-input" placeholder="Describe the high-level topic for the executive board..." rows="4"></textarea>
  `
};

/* DOM Refs */
const navBtns = document.querySelectorAll(".nav-btn");
const engineTitle = document.getElementById("activeEngineTitle");
const mainInput = document.getElementById("mainInput");
const btnExecute = document.getElementById("btnExecute");
const streamContent = document.getElementById("streamContent");
const evidenceList = document.getElementById("evidenceList");
const sentimentValue = document.getElementById("sentimentValue");
const waveformWrapper = document.getElementById("waveformWrapper");
const mediaGallery = document.getElementById("mediaGallery");
const galleryGrid = document.getElementById("galleryGrid");
const historyList = document.getElementById("historyList");
const actionCards = document.getElementById("actionCards");
const ideConsole = document.getElementById("ideConsole");
const consoleLogs = document.getElementById("consoleLogs");
const tabBtns = document.querySelectorAll(".tab-btn");

const fileAttachment = document.getElementById("fileAttachment");
const fileBadge = document.getElementById("fileBadge");

/* Navigation Routing */
navBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    if (state.isStreaming) return;
    navBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    state.activeEngine = btn.dataset.engine;
    
    // Set title to professional label
    engineTitle.textContent = btn.innerText.replace(/[^\w\s-]/g, '').trim();
    
    // Layout is now stable 3-column, no need for layout swaps
    
    renderDynamicInputs(state.activeEngine);
    resetTerminal();
  });
});

/* Initialization & Legacy Purge */
window.addEventListener("DOMContentLoaded", () => {
  const workspace = document.querySelector(".workspace");
  if (workspace) {
     workspace.classList.remove("layout-ide", "layout-dashboard", "layout-roundtable", "layout-standard");
  }
  renderDynamicInputs(state.activeEngine);
  resetTerminal();
});

/* Tab Logic */
tabBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    tabBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    
    const target = btn.dataset.tab;
    if (target === "history") {
      historyList.classList.remove("hidden");
      evidenceList.classList.add("hidden");
    } else {
      historyList.classList.add("hidden");
      evidenceList.classList.remove("hidden");
    }
  });
});

function renderDynamicInputs(engineId) {
  const container = document.getElementById("dynamicInputs");
  const mainInputEl = document.getElementById("mainInput");
  
  if (INPUT_CONFIG[engineId]) {
    container.innerHTML = INPUT_CONFIG[engineId];
    mainInputEl.classList.add("hidden");
  } else {
    // Default fallback
    container.innerHTML = "";
    mainInputEl.classList.remove("hidden");
  }
}

// Initial render
renderDynamicInputs("live-agent");

/* Attachments */
fileAttachment.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  state.mimeType = file.type;
  
  const reader = new FileReader();
  reader.onload = () => {
    state.base64File = reader.result.split(',')[1];
    fileBadge.textContent = `${file.name} ✕`;
    fileBadge.classList.remove("hidden");
  };
  reader.readAsDataURL(file);
});

fileBadge.addEventListener("click", () => {
  state.base64File = null;
  state.mimeType = null;
  fileAttachment.value = "";
  fileBadge.classList.add("hidden");
});

/* Core Execution */
btnExecute.addEventListener("click", executeEngine);

function compilePayloadText() {
  const dynMain = document.getElementById("dynamic-main");
  if (!dynMain) return mainInput.value.trim();

  // Combine dynamic fields based on engine
  let text = dynMain.value.trim();
  
  if (state.activeEngine === "financial-analyst") {
    const t = document.getElementById("dyn-ticker")?.value || "";
    const r = document.getElementById("dyn-range")?.value || "";
    text = `Tickers: ${t} | Timeframe: ${r}\n${text}`;
  } 
  else if (state.activeEngine === "health-diagnostic") {
    const p = document.getElementById("dyn-patient")?.value || "";
    text = `Vitals: ${p}\nSymptoms: ${text}`;
  }
  else if (state.activeEngine === "code-analyzer") {
    const r = document.getElementById("dyn-repo")?.value || "";
    text = `Target Repo/Path: ${r}\n${text}`;
  }
  else if (state.activeEngine === "marketing-strategist") {
    const p = document.getElementById("dyn-product")?.value || "";
    text = `Product Focus: ${p}\n${text}`;
  }

  return text;
}

async function executeEngine() {
  if (state.isStreaming) return;
  const userText = compilePayloadText();
  if (!userText && !state.base64File) return;

  state.isStreaming = true;
  btnExecute.disabled = true;
  
  // Clear both possible input sources
  mainInput.value = "";
  const dynMain = document.getElementById("dynamic-main");
  if (dynMain) dynMain.value = "";
  
  resetTerminal();

  const payload = {
    mode: state.activeEngine,
    sessionId: state.sessionId,
    userText,
    screenshotBase64: state.base64File || undefined,
    imageMimeType: state.mimeType || undefined
  };

  try {
    const isSSE = ["live-agent", "creative-storyteller", "code-analyzer", "financial-analyst", "data-scientist", "marketing-strategist", "video-director", "legal-scrutinizer", "security-auditor"].includes(state.activeEngine);
    
    if (state.activeEngine === "live-agent") {
      waveformWrapper.classList.remove("hidden");
      sentimentHud.classList.remove("hidden");
    }

    if (isSSE) {
      await streamEngine(payload);
    } else {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      renderFinal(data);
    }
  } catch (err) {
    appendTerminal(`\n\n[SYSTEM ERROR] ${err.message}`);
  } finally {
    state.isStreaming = false;
    btnExecute.disabled = false;
    waveformWrapper.classList.add("hidden");
  }
}

/* SSE Streaming Controller */
async function streamEngine(payload) {
  const resp = await fetch("/api/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    
    for (const rawLine of chunk.split("\n")) {
      const line = rawLine.trim();
      if (!line.startsWith("data:")) continue;
      try {
        const ev = JSON.parse(line.slice(5));
        if (ev.type === "chunk") {
          appendTerminal(ev.delta);
        }
      } catch (e) { /* ignore parse errors in fragments */ }
    }
  }

  // Fetch final metadata (guardrails/evidence) post-stream
  const finalMeta = await fetch("/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }).then(r => r.json());

  renderFinal(finalMeta, true);
}

function appendTerminal(text) {
  document.querySelector(".terminal-placeholder")?.remove();
  
  // Clean up cache injection prefixes if present
  const cText = text.replace("[CACHE HIT]", "<span style='color:var(--accent-green)'>[ENTERPRISE CACHE HIT]</span>");
  
  const span = document.createElement("span");
  span.className = "stream-word";
  span.innerHTML = cText;
  streamContent.appendChild(span);
  streamContent.parentElement.scrollTop = streamContent.parentElement.scrollHeight;
}

function renderFinal(data, skipText = false) {
  if (!skipText && data.responseText) {
    appendTerminal(data.responseText);
  }

  // Render Specific UI Actions, Stories, or Roundtable Minutes
  if (data.mode === "roundtable-conference") {
    const d = document.createElement("div");
    d.className = "story-block";
    d.style.borderColor = "var(--accent-purple)";
    d.innerHTML = `
      <div class="story-block-header" style="color:var(--accent-purple)">🏛️ Executive Board Consensus</div>
      <div style="font-family:var(--font-ui); font-size:0.8rem; margin-top:10px;">${data.responseText}</div>
    `;
    streamContent.appendChild(d);
  }
  else if (data.actions) {
    data.actions.forEach((act, i) => {
       const d = document.createElement("div");
       d.className = "action-step";
       d.innerHTML = `<div class="step-num">${i+1}</div><div><strong>${act.action.toUpperCase()}</strong> &rarr; ${act.description || act.target}</div>`;
       streamContent.appendChild(d);
    });
  }

  if (data.media) {
    renderMediaGallery(data.media);
  }

  // Handle Coding Engines (IDE Console)
  if (data.mode === "self-healing-coder" || data.mode === "code-analyzer") {
    renderIdeConsole(data);
  }

  // Handle Data/Finance Engines (Metric Cards)
  if (data.metadata) {
    if (data.mode === "financial-analyst") renderFinancialMetrics(data.metadata);
    if (data.mode === "code-analyzer") renderCodeMetrics(data.metadata);
    if (data.mode === "legal-scrutinizer") renderLegalMetrics(data.metadata);
    if (data.mode === "data-scientist") renderDataMetrics(data.metadata);
    if (data.mode === "marketing-strategist") renderMarketingMetrics(data.metadata);
    if (data.mode === "health-diagnostic") renderHealthMetrics(data.metadata);
    if (data.mode === "security-auditor") renderSecurityMetrics(data.metadata);
    if (data.mode === "video-director") renderVideoMetrics(data.metadata);
  }

  // Handle Roundtable (Avatars)
  if (data.mode === "roundtable-conference") {
    renderRoundtableAvatars(data);
  }

  // Update Sentiment HUD
  if (data.mode === "live-agent") {
    const sentimentEv = data.evidence?.find(e => e.source === "audio_sentiment");
    if (sentimentEv) {
      sentimentValue.textContent = sentimentEv.detail.split("(")[0].trim();
      sentimentHud.classList.remove("hidden");
    }
    
    // Check for "Intent" to render Action Cards
    if (data.responseText.toLowerCase().includes("schedule") || data.responseText.toLowerCase().includes("save")) {
       renderActionCards([
         { label: "Confirm Schedule", icon: "📅" },
         { label: "Save Excerpt", icon: "💾" }
       ]);
    }
  }

  // Add to History
  addToHistory(data);

  // Render Confidence (Removed from HUD, logging only in v6.0 for minimalism)
  console.log(`[Confidence] ${Math.round((data.confidence || 0) * 100)}%`);

  // Render Evidence / RAG Analytics
  if (data.evidence && data.evidence.length > 0) {
    let swarmDetected = false;
    
    evidenceList.innerHTML = data.evidence.map(e => {
      if (e.source.includes("swarm-orchestrator")) swarmDetected = true;
      const isSwarm = e.source.includes("swarm");
      const isAudio = e.source.includes("audio");
      
      return `
      <div class="evidence-item" style="border-left-color: ${isSwarm ? 'var(--accent-red)' : (isAudio ? 'var(--accent-green)' : 'var(--accent-purple)')}">
        <div class="ev-src" style="color: ${isSwarm ? 'var(--accent-red)' : 'var(--accent-purple)'}">${e.source.toUpperCase()}</div>
        <div class="ev-det">${e.detail}</div>
      </div>
    `}).join("");
    
    if (swarmDetected && window.triggerSwarmAnimation) {
       window.triggerSwarmAnimation();
    }
  } else {
    evidenceList.innerHTML = `<div class="empty-state">Awaiting RAG retrieval...</div>`;
  }
}

function renderFinancialMetrics(meta) {
  const d = document.createElement("div");
  d.className = "story-block";
  d.style.borderColor = "var(--accent-purple)";
  d.innerHTML = `
    <div class="story-block-header" style="color:var(--accent-purple)">📈 Quantitative Market Feed</div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:10px;">
      <div style="background:rgba(0,0,0,0.3); padding:10px; border-radius:8px; border:1px solid var(--panel-border)">
        <div style="font-size:0.6rem; color:var(--text-muted)">MARKET SENTIMENT</div>
        <div style="font-size:1.2rem; font-weight:700; color:var(--accent-cyan)">${meta.marketSentiment}/100</div>
      </div>
      <div style="background:rgba(0,0,0,0.3); padding:10px; border-radius:8px; border:1px solid var(--panel-border)">
        <div style="font-size:0.6rem; color:var(--text-muted)">VOLATILITY PROFILE</div>
        <div style="font-size:1.2rem; font-weight:700; color:var(--accent-purple)">${meta.volatilityProfile}%</div>
      </div>
    </div>
  `;
  streamContent.appendChild(d);
}

function renderCodeMetrics(meta) {
  const d = document.createElement("div");
  d.className = "story-block";
  d.style.borderColor = "var(--accent-cyan)";
  d.innerHTML = `
    <div class="story-block-header" style="color:var(--accent-cyan)">💻 Structural Health Audit</div>
    <div style="margin-top:10px;">
      <div class="flex-between" style="font-size:0.75rem; margin-bottom:4px;">
        <span>CODE HEALTH SCORE</span>
        <span style="font-weight:700; color:var(--accent-cyan)">${meta.healthScore}/100</span>
      </div>
      <div style="height:8px; background:rgba(255,255,255,0.05); border-radius:4px; overflow:hidden;">
        <div style="width:${meta.healthScore}%; height:100%; background:var(--accent-cyan); box-shadow:0 0 10px var(--accent-cyan)"></div>
      </div>
    </div>
  `;
  streamContent.appendChild(d);
}

function renderLegalMetrics(meta) {
  const color = meta.legalRiskPulse > 7 ? 'var(--accent-red)' : 'var(--accent-amber)';
  const d = document.createElement("div");
  d.className = "story-block";
  d.style.borderColor = color;
  d.innerHTML = `
    <div class="story-block-header" style="color:${color}">⚖️ Legal Risk Pulse</div>
    <div style="margin-top:10px;">
      <div class="flex-between" style="font-size:0.75rem; margin-bottom:4px;">
        <span>LIABILITY RATING</span>
        <span style="font-weight:700; color:${color}">${meta.legalRiskPulse}/10</span>
      </div>
      <div style="height:8px; background:rgba(255,255,255,0.05); border-radius:4px; overflow:hidden;">
        <div style="width:${meta.legalRiskPulse * 10}%; height:100%; background:${color};"></div>
      </div>
    </div>
  `;
  streamContent.appendChild(d);
}

function renderDataMetrics(meta) {
  const d = document.createElement("div");
  d.className = "story-block";
  d.innerHTML = `
    <div class="story-block-header" style="color:var(--accent-green)">🧪 Statistical Workbench</div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:10px;">
      <div style="background:rgba(0,0,0,0.3); padding:8px; border-radius:6px;">
        <div style="font-size:0.6rem; color:var(--text-muted)">P-VALUE</div>
        <div style="font-size:1rem; font-weight:700;">${meta.pValue}</div>
      </div>
      <div style="background:rgba(0,0,0,0.3); padding:8px; border-radius:6px;">
        <div style="font-size:0.6rem; color:var(--text-muted)">PEARSON R</div>
        <div style="font-size:1rem; font-weight:700;">${meta.correlation}</div>
      </div>
    </div>
  `;
  streamContent.appendChild(d);
}

function renderMarketingMetrics(meta) {
  const d = document.createElement("div");
  d.className = "story-block";
  d.style.borderColor = "var(--accent-red)";
  d.innerHTML = `
    <div class="story-block-header" style="color:var(--accent-red)">🎯 Forecasted Growth</div>
    <div class="flex-between" style="margin-top:10px; background:rgba(0,0,0,0.2); padding:10px; border-radius:8px;">
      <div>
        <div style="font-size:0.6rem; color:var(--text-muted)">TARGET ROAS</div>
        <div style="font-size:1.5rem; font-weight:800; color:var(--accent-red)">${meta.forecastedROAS}x</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:0.6rem; color:var(--text-muted)">PRIMARY CHANNEL</div>
        <div style="font-size:0.85rem; font-weight:700; color:var(--text-main)">${meta.primaryChannel}</div>
      </div>
    </div>
  `;
  streamContent.appendChild(d);
}

function renderHealthMetrics(meta) {
  const color = meta.triageLevel === "Critical" ? "var(--accent-red)" : (meta.triageLevel === "Urgent" ? "var(--accent-amber)" : "var(--accent-green)");
  const d = document.createElement("div");
  d.className = "story-block";
  d.style.borderColor = color;
  d.innerHTML = `
    <div class="story-block-header" style="color:${color}">🏥 Triage Diagnostic</div>
    <div class="flex-between" style="margin-top:10px;">
      <span style="font-size:0.8rem; font-weight:700;">PRIORITY: <span style="color:${color}">${meta.triageLevel.toUpperCase()}</span></span>
      <div class="status-dot ${meta.triageLevel === 'Critical' ? 'error' : 'healthy'}"></div>
    </div>
  `;
  streamContent.appendChild(d);
}

function renderSecurityMetrics(meta) {
  const d = document.createElement("div");
  d.className = "story-block";
  d.style.borderColor = "var(--accent-red)";
  d.innerHTML = `
    <div class="story-block-header" style="color:var(--accent-red)">🛡️ Vulnerability Severity</div>
    <div style="margin-top:10px;">
      <div class="flex-between" style="font-size:0.75rem; margin-bottom:4px;">
        <span>CVSS v3.1 BASE SCORE</span>
        <span style="font-weight:800; color:var(--accent-red)">${meta.threatSeverity}</span>
      </div>
      <div style="height:12px; background:rgba(0,0,0,0.4); border-radius:6px; overflow:hidden; border:1px solid rgba(255,255,255,0.1);">
        <div style="width:${meta.threatSeverity * 10}%; height:100%; background:linear-gradient(90deg, #ffcc00, #ff0000); box-shadow:0 0 15px var(--accent-red);"></div>
      </div>
    </div>
  `;
  streamContent.appendChild(d);
}

function renderVideoMetrics(meta) {
  const d = document.createElement("div");
  d.className = "story-block";
  d.style.borderColor = "var(--accent-cyan)";
  d.innerHTML = `
    <div class="story-block-header" style="color:var(--accent-cyan)">🎬 Production Rhythm</div>
    <div class="flex-between" style="margin-top:10px;">
       <div>
         <div style="font-size:0.6rem; color:var(--text-muted)">SHOT COUNT</div>
         <div style="font-size:1.2rem; font-weight:800;">${meta.shotCount} Units</div>
       </div>
       <div style="text-align:right">
         <div style="font-size:0.6rem; color:var(--text-muted)">CINEMATIC RHYTHM</div>
         <div style="font-size:1.2rem; font-weight:800; color:var(--accent-cyan)">${meta.cinematicRhythm}/100</div>
       </div>
    </div>
  `;
  streamContent.appendChild(d);
}

function renderRoundtableAvatars(data) {
  const d = document.createElement("div");
  d.className = "roundtable-grid";
  const agents = [
    { name: "CEO Bot", icon: "🎩", color: "var(--accent-cyan)" },
    { name: "CTO Bot", icon: "⚙️", color: "var(--accent-purple)" },
    { name: "CFO Bot", icon: "💰", color: "var(--accent-green)" },
    { name: "Legal Bot", icon: "⚖️", color: "var(--accent-amber)" }
  ];
  
  d.innerHTML = agents.map(a => `
    <div class="roundtable-quadrant" style="border-top: 3px solid ${a.color}">
      <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
        <span style="font-size:1.5rem">${a.icon}</span>
        <span style="font-weight:700; font-size:0.8rem">${a.name}</span>
        <span class="status-dot healthy" style="margin-left:auto"></span>
      </div>
      <div style="font-size:0.75rem; line-height:1.4; opacity:0.8 italic">Analyzing global markets for consensus...</div>
    </div>
  `).join("");
  
  streamContent.appendChild(d);
}

async function renderIdeConsole(data) {
  ideConsole.classList.remove("hidden");
  consoleLogs.innerHTML = "";
  
  const logs = [
    { type: "info", text: "> context-aware-compiler --target enterprise-v5" },
    { type: "info", text: "Scanning workspace for circular dependencies..." },
    { type: "success", text: "Dependency graph validated. (0.4s)" },
    { type: "info", text: "Executing heuristic analysis on modified AST..." },
    { type: "info", text: "Running regression tests (842 suites)..." },
    { type: "success", text: "PASS: AuthenticationServiceTests" },
    { type: "success", text: "PASS: DistributedLedgerProtocol" },
    { type: "success", text: "Build SUCCESSFUL. Binary deployed to virtual cluster." }
  ];

  for (const log of logs) {
    const div = document.createElement("div");
    div.className = `log-line ${log.type}`;
    div.textContent = log.text;
    consoleLogs.appendChild(div);
    consoleLogs.scrollTop = consoleLogs.scrollHeight;
    await new Promise(r => setTimeout(r, 200)); // Simulate typing
  }
}

function renderMediaGallery(media) {
  mediaGallery.classList.remove("hidden");
  galleryGrid.innerHTML = "";
  
  media.forEach(item => {
    const div = document.createElement("div");
    div.className = "gallery-item";
    
    // In Upgrade 5.0, we simulate the asset generation flow
    // If it's an image content or image prompt, we show a professional placeholder
    const isImage = item.kind === "image" || item.content.toLowerCase().includes("image prompt");
    const imgUrl = isImage 
      ? `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80` // Geometric digital art
      : `https://images.unsplash.com/photo-1639322537228-f710d846310a?w=400&q=80`; // Abstract data visualization
      
    div.innerHTML = `<img src="${imgUrl}" alt="${item.kind}">`;
    div.title = item.content;
    galleryGrid.appendChild(div);
  });
}

function renderActionCards(actions) {
  actionCards.classList.remove("hidden");
  actionCards.innerHTML = actions.map(a => `
    <button class="action-card-btn"><span>${a.icon}</span> ${a.label}</button>
  `).join("");
}

function addToHistory(data) {
  const item = {
    id: Date.now(),
    title: engineTitle.textContent,
    timestamp: new Date().toLocaleTimeString(),
    mode: data.mode,
    preview: (data.responseText || "").slice(0, 40) + "..."
  };
  state.history.unshift(item);
  
  renderHistory();
  document.getElementById("btnExport").disabled = false;
}

function renderHistory() {
  historyList.innerHTML = state.history.map(item => `
    <div class="history-item">
      <div class="hist-time">${item.timestamp}</div>
      <div class="hist-title">${item.title}</div>
      <div style="font-size:0.7rem; color:var(--text-muted)">${item.preview}</div>
    </div>
  `).join("");
}

function resetTerminal() {
  streamContent.innerHTML = "";
  // evidenceList is handled by tabs, but we reset its data
  evidenceList.innerHTML = `<div class="empty-state">Awaiting RAG retrieval...</div>`;
  mediaGallery.classList.add("hidden");
  actionCards.classList.add("hidden");
  ideConsole.classList.add("hidden");
}
