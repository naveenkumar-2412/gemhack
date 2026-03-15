# Google Cloud Deployment Proof Guide

Use this guide to create the required proof artifact for submission.

## Option A: Short Screen Recording (Recommended)
1. Open Cloud Run service page in Google Cloud Console.
2. Show service name, region, URL, and latest revision.
3. Show logs receiving a request from the app.
4. Show Firestore collection updates for a session turn.
5. Keep this recording separate from your main product demo video.

## Option B: Repo Code Proof
Reference these files in your Devpost submission:
- `cloudbuild.yaml`
- `deploy/cloudrun.ps1`
- `deploy/proof-gcp.ps1`
- `infra/main.tf`
- `src/lib/firestore.ts`

## CLI Proof Script
Run:

```powershell
./deploy/proof-gcp.ps1 -ProjectId YOUR_PROJECT_ID -Region us-central1 -Service gemhack-agent
```

This prints:
- Cloud Run URL
- Latest ready revision
- Recent Cloud Run logs
- Firestore API enabled status
