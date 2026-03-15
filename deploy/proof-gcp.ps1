param(
  [Parameter(Mandatory = $true)][string]$ProjectId,
  [string]$Region = "us-central1",
  [string]$Service = "gemhack-agent"
)

$ErrorActionPreference = "Stop"

Write-Host "Setting gcloud project to $ProjectId"
gcloud config set project $ProjectId | Out-Null

Write-Host "\n=== Cloud Run Service URL ==="
gcloud run services describe $Service --region $Region --format="value(status.url)"

Write-Host "\n=== Cloud Run Latest Ready Revision ==="
gcloud run services describe $Service --region $Region --format="value(status.latestReadyRevisionName)"

Write-Host "\n=== Recent Cloud Run Logs (20 lines) ==="
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=$Service" --limit=20 --format="value(timestamp,textPayload)"

Write-Host "\n=== Firestore API Enabled? ==="
gcloud services list --enabled --filter="name:firestore.googleapis.com" --format="value(name)"

Write-Host "\nProof capture complete. Screen-record this output + Cloud Console service view for Devpost proof."
