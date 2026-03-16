# Google Cloud Deployment Proof

This project has been fully deployed to Google Cloud per the contest requirements. Below are the specific artifacts and details verifying the deployment.

## Deployment Details
- **Project ID:** 	ri-sense
- **Region:** sia-south1
- **Service Name:** gemhack-agent
- **Google Cloud Run API URL:** https://gemhack-agent-441484548873.asia-south1.run.app
- **Latest Live Revision:** gemhack-agent-00007-twm

## Infrastructure & Services Used
1. **Cloud Run:** Hosts the containerized Node.js, Express, and WebSocket server securely.
2. **Secret Manager:** Safely handles the GEMINI_API_KEY (Secret Name: gemini-api-key). The service account uses the oles/secretmanager.secretAccessor role to bind this securely.
3. **Cloud Build / Artifact Registry:** Handles source deployment (cloud-run-source-deploy), container orchestration, and CI pipelines (defined in cloudbuild.yaml).
4. **Cloud Logging:** Captures all container startup, stream errors, and API payload traces.

## Verifying Health manually
You can ping the live health endpoint at any time to verify the runtime environment is active:
`ash
curl https://gemhack-agent-441484548873.asia-south1.run.app/health
`
*(Should return {"ok":true,"service":"gemhack-multimodal-agent",...})*

## Video Outline for Proof of Deployment (Optional/Bonus)
If attaching a screen recording:
1. Open up **Google Cloud Console > Cloud Run > tri-sense**.
2. Show the active gemhack-agent with traffic routed to latest.
3. Open **Logs explorer**, click "Run" on the live frontend URL to show the [Cognitive Pipeline] Executing Engine: ... trace arriving in realtime.
4. Show the **Secret Manager** dashboard verifying gemini-api-key is established and bound to the service env.
