# TriSense Agent (Gemini Live Agent Challenge)

TriSense Agent is a next-generation multimodal AI agent platform: one system covering all three challenge categories simultaneously.

| Mode | Description |
|---|---|
| 🗣️ **Live Agent** | Real-time, interruption-tolerant voice assistance over WebSocket + Gemini Live API |
| ✍️ **Creative Storyteller** | One prompt → structured interleaved output: narrative, image prompt, voiceover, video shot list |
| ☸️ **UI Navigator** | Screenshot + intent → typed, numbered action plan via Gemini multimodal vision |

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 + TypeScript |
| Framework | Express + WebSocket (`ws`) |
| AI | `@google/generative-ai` SDK (gemini-2.0-flash + gemini-live-2.5-flash-preview) |
| Session Memory | Google Cloud Firestore |
| Hosting | Google Cloud Run |
| CI/CD | Google Cloud Build (`cloudbuild.yaml`) |
| IaC (bonus) | Terraform + Secret Manager (`infra/`) |
| Frontend | Glassmorphism SPA (vanilla JS, Web Audio API waveform) |
| Testing | Vitest + Supertest |

## Project Structure

```
src/
  server.ts           — Express + WebSocket server, SSE stream, rate limiting, logging
  agent.ts            — Mode orchestrator + guardrails + Firestore persistence
  config.ts           — Environment config
  types.ts            — AgentInput, AgentOutput, StorySection, ActionStep, LiveTurn
  modes/
    liveAgent.ts      — Live voice mode (context-aware, locale support)
    storyteller.ts    — Creative mode (structured section parser)
    uiNavigator.ts    — Vision mode (real Gemini Vision API call)
  lib/
    gemini.ts         — @google/generative-ai SDK wrapper + streaming generator
    geminiVision.ts   — Multimodal image+text helper (inlineData)
    geminiLiveRelay.ts — Upstream WebSocket relay to Gemini Live API
    firestore.ts      — Session turn persistence + history retrieval
    sessionContext.ts — Loads Firestore turns and formats as Gemini Content[] history
  middleware/
    logger.ts         — Structured JSON request logger
    rateLimit.ts      — express-rate-limit (60 req/min general, 20 for stream)
public/
  index.html          — SPA with mode tabs, waveform canvas, screenshot upload
  styles.css          — Dark glassmorphism design system
  app.js              — WebSocket client, SSE consumer, Web Audio waveform, rich rendering
cloudbuild.yaml       — CI/CD: npm test → Docker build → Cloud Run deploy
deploy/
  cloudrun.ps1        — One-command PowerShell deploy
  proof-gcp.ps1       — Cloud Run URL/logs proof script
  docker-compose.yml  — Local dev stack (agent + Firestore emulator)
infra/
  main.tf             — Terraform: Cloud Run, Firestore, Secret Manager (GEMINI_API_KEY), Artifact Registry
docs/
  architecture.md     — Full system Mermaid diagram
  devpost-submission.md — Complete Devpost story
  demo-script.md      — 3m30s video guide
```

## Local Setup

1. **Install Node.js 20+**

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   ```bash
   copy .env.example .env   # Windows
   # Fill in GEMINI_API_KEY and optionally GOOGLE_CLOUD_PROJECT
   ```

4. **Run dev server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:8080`

   > Without `GEMINI_API_KEY` the app returns mock responses — the full UI flow remains testable.

5. **Run tests:**
   ```bash
   npm test
   ```

## Docker Compose (recommended for full local stack)

```bash
docker compose -f deploy/docker-compose.yml up
```
Starts the agent + a local Firestore emulator. No GCP project required.

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Basic health check |
| GET | `/api/health/deep` | Gemini + Firestore reachability |
| GET | `/api/modes` | Mode capabilities metadata |
| POST | `/api/agent` | Full agent call (JSON response) |
| POST | `/api/stream` | SSE streaming agent call |
| GET | `/api/session/:id` | Session history |
| WS | `/ws` | WebSocket for Live Agent + audio |

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | Yes | — | Google AI API key |
| `GEMINI_MODEL` | No | `gemini-2.0-flash` | Standard model ID |
| `GEMINI_LIVE_MODEL` | No | `gemini-live-2.5-flash-preview` | Live API model ID |
| `GEMINI_LIVE_ENABLED` | No | `false` | Enable upstream Gemini Live relay |
| `GOOGLE_CLOUD_PROJECT` | No | — | GCP project (enables Firestore) |
| `GOOGLE_CLOUD_LOCATION` | No | `us-central1` | GCP region |
| `FIRESTORE_COLLECTION` | No | `sessions` | Firestore root collection |
| `GEMINI_TIMEOUT_MS` | No | `25000` | Per-call Gemini timeout |
| `AGENT_TIMEOUT_MS` | No | `30000` | Request-level timeout |
| `PORT` | No | `8080` | HTTP server port |

## Deploy to Cloud Run (PowerShell)

```powershell
./deploy/cloudrun.ps1 -ProjectId YOUR_PROJECT_ID -Region us-central1 -Service gemhack-agent
```

## Deploy with Cloud Build (CI/CD)

Push to your connected repository — Cloud Build automatically:
1. Runs `npm test` (blocks deploy on failure)
2. Builds and pushes Docker image to Artifact Registry
3. Deploys to Cloud Run with `min-instances=1` and Secret Manager key injection

## Deploy with Terraform (Bonus IaC)

```bash
cd infra
terraform init
terraform apply \
  -var="project_id=YOUR_PROJECT_ID" \
  -var="region=us-central1" \
  -var="image_uri=us-central1-docker.pkg.dev/YOUR_PROJECT_ID/gemhack/gemhack-agent:latest" \
  -var="gemini_api_key=YOUR_API_KEY"
```

## Cloud Proof

```powershell
./deploy/proof-gcp.ps1 -ProjectId YOUR_PROJECT_ID -Region us-central1 -Service gemhack-agent
```
Prints Cloud Run URL, active revision, and recent logs for your proof recording.

## Reproducibility Checklist (for Judges)

- [x] Public code repo with this README
- [x] Spin-up instructions (see Local Setup above)
- [x] Tests: `npm test`
- [x] Architecture diagram in `docs/architecture.md`
- [x] Cloud deployment proof via `deploy/proof-gcp.ps1`
- [x] Demo video ≤ 4 minutes (follow `docs/demo-script.md`)
- [x] Docker Compose for zero-GCP-project local validation
