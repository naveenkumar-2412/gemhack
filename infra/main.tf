terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.42"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

resource "google_project_service" "required" {
  for_each = toset([
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "cloudbuild.googleapis.com",
    "firestore.googleapis.com",
    "secretmanager.googleapis.com"
  ])
  service            = each.value
  disable_on_destroy = false
}

resource "google_artifact_registry_repository" "repo" {
  repository_id = "gemhack"
  location      = var.region
  format        = "DOCKER"
  depends_on    = [google_project_service.required]
}

# Store GEMINI_API_KEY securely in Secret Manager
resource "google_secret_manager_secret" "gemini_api_key" {
  secret_id = "gemini-api-key"
  replication { auto {} }
  depends_on = [google_project_service.required]
}

resource "google_secret_manager_secret_version" "gemini_api_key_version" {
  secret      = google_secret_manager_secret.gemini_api_key.id
  secret_data = var.gemini_api_key
}

resource "google_cloud_run_v2_service" "agent" {
  name     = "gemhack-agent"
  location = var.region

  template {
    # min_instance_count=1 eliminates cold starts for demo reliability
    scaling { min_instance_count = 1 }

    containers {
      image = var.image_uri

      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }
      env {
        name  = "GOOGLE_CLOUD_LOCATION"
        value = var.region
      }
      env {
        name  = "GEMINI_MODEL"
        value = "gemini-2.0-flash"
      }
      env {
        name  = "GEMINI_LIVE_MODEL"
        value = "gemini-live-2.5-flash-preview"
      }
      env {
        name  = "GEMINI_LIVE_ENABLED"
        value = "true"
      }
      # API key injected from Secret Manager (not plain-text)
      env {
        name = "GEMINI_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.gemini_api_key.secret_id
            version = "latest"
          }
        }
      }
    }
  }

  depends_on = [google_artifact_registry_repository.repo]
}

resource "google_cloud_run_v2_service_iam_member" "public_invoker" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.agent.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Grant Cloud Run SA access to read the secret
resource "google_secret_manager_secret_iam_member" "run_secret_access" {
  secret_id = google_secret_manager_secret.gemini_api_key.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_cloud_run_v2_service.agent.template[0].service_account}"
}
