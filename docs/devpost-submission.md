# Devpost Submission Draft

## Project Name
TriSense Agent: See, Hear, Speak, and Create

## Category
Primary: Live Agents (supports all 3 challenge modes in one platform)

## Summary
TriSense Agent is a multimodal, real-time system that moves beyond text chat. It combines voice-first interaction, visual context understanding, and interleaved creative output in one live experience. Users can switch between three modes:
1. **Live Agent** for interruption-friendly voice-like assistance.
2. **Creative Storyteller** for interleaved narrative + visual/audio/video planning output.
3. **UI Navigator** for screenshot-based intent-to-action plans.

The backend is deployed on Google Cloud Run and integrates Gemini model calls via the Google Generative Language API format, with session memory stored in Firestore.

## Features and Functionality
- Real-time response channel via WebSocket.
- Structured agent outputs with confidence, warnings, and executable actions.
- Interleaved multimodal payloads (text/image/audio/video descriptors).
- Session memory persistence in Firestore for continuity.
- Deployment automation via Cloud Build + optional Terraform IaC.

## Technologies Used
- Node.js + TypeScript
- Express + WebSocket (`ws`)
- Gemini model API integration
- Google Cloud Run
- Firestore
- Cloud Build
- Terraform (bonus automation path)

## Data Sources
- User-provided prompts/transcripts/screenshots.
- No external private dataset is required in default mode.

## Findings and Learnings
- One orchestrator with mode-specific policies keeps architecture simple while preserving category-specific behavior.
- Confidence/warnings metadata helps reduce over-trust and improves demo clarity for judges.
- Cloud-native deployment and IaC artifacts increase reproducibility and judging confidence.

## Public Code Repository
Add your public repo URL here.

## Proof of Google Cloud Deployment
Provide either:
1. A short screen recording of Cloud Run service, logs, and live request handling.
2. Link to cloud deployment files in repo (`cloudbuild.yaml`, `deploy/cloudrun.ps1`, `infra/main.tf`) and runtime code using GCP services.

## Demo Video Plan (<4 min)
- Problem statement (20s)
- Live Agent mode demo (70s)
- Creative Storyteller demo (60s)
- UI Navigator demo (60s)
- Cloud deployment proof snippet (20s)
- Value proposition and close (30s)

## Bonus Components
- Publish a blog post and include statement: “Created for entering the Gemini Live Agent Challenge.”
- Share post with hashtag `#GeminiLiveAgentChallenge`.
- Include Terraform/deployment automation in repo.
- Add GDG profile link if applicable.
