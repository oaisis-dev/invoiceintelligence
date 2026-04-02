# Email Intake — Cloud Run Job (Bun)
# Runs on cron schedule, polls IMAP for invoice emails
# Migrated from Python to Bun — see apps/worker-email/Dockerfile

locals {
  intake_image = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.workers.repository_id}/email-intake:${local.image_tag}"
}

resource "google_cloud_run_v2_job" "email_intake" {
  name     = "email-intake${local.name_suffix}"
  location = var.region

  template {
    template {
      service_account = google_service_account.worker.email
      timeout         = "300s"

      containers {
        image = local.intake_image

        # Bun entrypoint — replaces previous Python command
        command = ["bun", "run", "apps/worker-email/src/index.ts"]

        resources {
          limits = {
            cpu    = "1"
            memory = "1Gi"
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
        # Email OAuth — secrets for DB-driven multi-account intake
        env {
          name = "GOOGLE_OAUTH_CLIENT_ID"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.secrets["${local.secret_prefix}google-oauth-client-id"].secret_id
              version = "latest"
            }
          }
        }
        env {
          name = "GOOGLE_OAUTH_CLIENT_SECRET"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.secrets["${local.secret_prefix}google-oauth-client-secret"].secret_id
              version = "latest"
            }
          }
        }
        env {
          name = "EMAIL_TOKEN_ENCRYPTION_KEY"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.secrets["${local.secret_prefix}email-token-encryption-key"].secret_id
              version = "latest"
            }
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
