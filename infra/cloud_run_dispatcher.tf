# Notification Dispatcher — Cloud Run Service (Bun + Hono)
# Receives Pub/Sub push messages at POST /dispatch
# Reconciliation triggered by Cloud Scheduler at POST /reconcile
# Migrated from Python to Bun — see apps/dispatcher/Dockerfile

locals {
  dispatcher_image = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.workers.repository_id}/notification-dispatcher:${local.image_tag}"
}

resource "google_cloud_run_v2_service" "dispatcher" {
  name     = "notification-dispatcher${local.name_suffix}"
  location = var.region

  template {
    service_account = google_service_account.dispatcher.email

    scaling {
      min_instance_count = 0
      max_instance_count = var.max_instances_default
    }

    timeout = "30s"

    containers {
      image = local.dispatcher_image

      ports {
        container_port = 8080
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      # Non-secret env vars
      env {
        name  = "EMAIL_PROVIDER"
        value = var.email_provider
      }
      env {
        name  = "LOG_LEVEL"
        value = "INFO"
      }
      env {
        name  = "APP_URL"
        value = var.app_url
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
        name = "BREVO_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["${local.secret_prefix}brevo-api-key"].secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "BREVO_SENDER_EMAIL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["${local.secret_prefix}brevo-sender-email"].secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "BREVO_SENDER_NAME"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["${local.secret_prefix}brevo-sender-name"].secret_id
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

# Allow dispatcher service account to be invoked by Pub/Sub
resource "google_cloud_run_v2_service_iam_member" "dispatcher_pubsub_invoker" {
  name     = google_cloud_run_v2_service.dispatcher.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.dispatcher.email}"
}
