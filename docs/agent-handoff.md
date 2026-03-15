# Agent Handoff: TriSense Agent

## What This Project Is
TriSense Agent is a multimodal AI platform built for the Gemini Live Agent Challenge. It contains three challenge-aligned modes in one codebase:
- Live Agent: real-time voice interaction with interruption handling and Gemini Live relay path.
- Creative Storyteller: interleaved text/image/audio/video planning output.
- UI Navigator: screenshot-grounded intent-to-action planning with safety guardrails.

The stack is Node.js + TypeScript backend, simple static frontend, WebSocket live channel, Google Cloud deploy artifacts (Cloud Run + Cloud Build + Terraform), and Firestore-backed session persistence.

## Current State (Implemented)
- API + WS runtime in `src/server.ts`.
- Mode orchestration and validation in `src/agent.ts`.
- Gemini text and Gemini Live relay integration in `src/lib/gemini.ts` and `src/lib/geminiLiveRelay.ts`.
- Firestore save + session history retrieval in `src/lib/firestore.ts`.
- Live relay resilience implemented:
  - reconnect with exponential backoff (`connectWithRetry` / `reconnectWithRetry`)
  - explicit live turn phases: `idle`, `listening`, `generating`, `completed`, `cancelled`, `error`
  - websocket cancellation path via `live_cancel`
- Frontend includes:
  - mode switching
  - live mic controls
  - screenshot upload/preview
  - grounding/evidence panel
  - risk guardrail confirmation panel
  - session history viewer
  - demo checklist tracker
- Submission docs and deployment proof scripts are already present in `docs/` and `deploy/`.
- Tests pass (`npm test`).

## What Should Continue (For Other Agents)
1. Productionize live audio path further:
- Replace current minimal PCM playback assumptions with robust codec negotiation.
- Persist live turn phase transitions in Firestore for observability.
- Add client UI controls for explicit cancel/retry using `live_cancel` and `live_state` events.

2. Strengthen UI Navigator action safety:
- Add action simulation mode (`dryRun=true`) and explicit step-by-step approval.
- Add action policy config (allow/deny lists) per environment.
- Add audit log for high-risk intents and confirmations.

3. Improve grounding quality:
- Attach retrieval/knowledge source references when external context is used.
- Add confidence calibration by mode and include uncertainty reasons.
- Add hallucination regression tests with deterministic prompts.

4. Improve testing depth:
- Add websocket integration tests for live event protocol.
- Add snapshot tests for `guardrail` and `evidence` payload structures.
- Add contract tests for `/api/session/:id` with mocked Firestore data.

5. Submission polish:
- Record final cloud-proof clip using `deploy/proof-gcp.ps1`.
- Finalize 4-minute demo with checklist fully completed.
- Ensure Devpost submission links point to public repo and architecture assets.

## Quick Commands
- Install: `npm install`
- Build: `npm run build`
- Test: `npm test`
- Dev: `npm run dev`
- Cloud deploy: `./deploy/cloudrun.ps1 -ProjectId YOUR_PROJECT_ID -Region us-central1 -Service gemhack-agent`
- Cloud proof: `./deploy/proof-gcp.ps1 -ProjectId YOUR_PROJECT_ID -Region us-central1 -Service gemhack-agent`
