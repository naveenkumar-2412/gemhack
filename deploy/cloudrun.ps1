param(
  [Parameter(Mandatory = $true)][string]$ProjectId,
  [string]$Region = "us-central1",
  [string]$Service = "gemhack-agent"
)

$ErrorActionPreference = "Stop"

Write-Host "Setting project..."
gcloud config set project $ProjectId

Write-Host "Enabling services..."
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com

Write-Host "Creating Artifact Registry repo if missing..."
gcloud artifacts repositories create gemhack --repository-format=docker --location=$Region --description="GemHack images" 2>$null

$ImageUri = "$Region-docker.pkg.dev/$ProjectId/gemhack/$Service:latest"

Write-Host "Building and deploying with Cloud Build..."
gcloud builds submit --config cloudbuild.yaml --substitutions _REGION=$Region,_SERVICE=$Service,_IMAGE_URI=$ImageUri

Write-Host "Deployment complete."
gcloud run services describe $Service --region $Region --format="value(status.url)"
