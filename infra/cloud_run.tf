# Processing Worker — Cloud Run Service (Bun + Hono)
# Receives Pub/Sub push messages at POST /process
# Migrated from Python to Bun — see apps/worker-invoice/Dockerfile

locals {
  worker_image = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.workers.repository_id}/invoice-worker:${local.image_tag}"
}

resource "google_cloud_run_v2_service" "worker" {
  name     = "invoice-worker${local.name_suffix}"
  location = var.region

  template {
    service_account = google_service_account.worker.email

    scaling {
      min_instance_count = 0
      max_instance_count = var.max_instances_worker
    }

    timeout = "900s"

    containers {
      image = local.worker_image

      ports {
        container_port = 8080
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "2Gi"
        }
      }

      # Non-secret env vars
      env {
        name  = "GCP_PROJECT_ID"
        value = var.project_id
      }
      env {
        name  = "GCS_BUCKET_NAME"
        value = var.gcs_bucket_name
      }
      env {
        name  = "PUBSUB_TOPIC"
        value = var.pubsub_topic_name
      }
      env {
        name  = "LOG_LEVEL"
        value = "INFO"
      }
      env {
        name  = "INVOICE_TEST_MODE"
        value = "0"
      }

      # Secrets from Secret Manager
      env {
        name = "SUPABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["${local.secret_prefix}supabase-url"].secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "SUPABASE_SECRET_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["${local.secret_prefix}supabase-secret-key"].secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "GEMINI_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["${local.secret_prefix}gemini-api-key"].secret_id
            version = "latest"
          }
        }
      }
    }
  }

  depends_on = [
    google_project_service.apis,
    google_secret_manager_secret_version.secrets,
  ]
}

# Allow Pub/Sub service account to invoke the worker
data "google_project" "current" {}

resource "google_cloud_run_v2_service_iam_member" "pubsub_invoker" {
  name     = google_cloud_run_v2_service.worker.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.worker.email}"
}
