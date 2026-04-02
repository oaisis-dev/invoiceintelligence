# Frontend — Cloud Run Service
# Serves the Next.js app with Clerk auth, Supabase queries, GCS uploads

locals {
  frontend_image = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.workers.repository_id}/invoice-frontend:${local.image_tag}"
}

resource "google_cloud_run_v2_service" "frontend" {
  name     = "invoice-frontend${local.name_suffix}"
  location = var.region

  template {
    service_account = google_service_account.frontend.email

    scaling {
      min_instance_count = 0
      max_instance_count = var.max_instances_frontend
    }

    timeout = "60s"

    containers {
      image = local.frontend_image

      ports {
        container_port = 8080
      }

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
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "BACKEND_API_URL"
        value = var.backend_api_url
      }
      env {
        name  = "APP_ENV"
        value = var.environment
      }
      # Next.js standalone defaults to localhost — must be 0.0.0.0 for Cloud Run
      env {
        name  = "HOSTNAME"
        value = "0.0.0.0"
      }
      # Clerk middleware reads these server-side via process.env at runtime
      env {
        name  = "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
        value = var.clerk_publishable_key
      }
      env {
        name  = "NEXT_PUBLIC_CLERK_DOMAIN"
        value = var.clerk_domain
      }

      # Secrets from Secret Manager
      env {
        name = "CLERK_SECRET_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["${local.secret_prefix}clerk-secret-key"].secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "CLERK_WEBHOOK_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["${local.secret_prefix}clerk-webhook-secret"].secret_id
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
        name = "NEXT_PUBLIC_SUPABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["${local.secret_prefix}supabase-url"].secret_id
            version = "latest"
          }
        }
      }
      # Non-prefixed duplicate — NEXT_PUBLIC_* gets inlined at build time by
      # Next.js, so server code can't read the runtime value. This env var
      # is read by runtime-config.ts for server-side Supabase client creation.
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
        name = "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["${local.secret_prefix}supabase-publishable-key"].secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "SUPABASE_PUBLISHABLE_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["${local.secret_prefix}supabase-publishable-key"].secret_id
            version = "latest"
          }
        }
      }

      # Billing / Stripe
      env {
        name  = "PAYMENT_PROVIDER"
        value = var.payment_provider
      }
      env {
        name  = "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
        value = var.stripe_publishable_key
      }
      env {
        name = "STRIPE_SECRET_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["${local.secret_prefix}stripe-secret-key"].secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "STRIPE_WEBHOOK_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["${local.secret_prefix}stripe-webhook-secret"].secret_id
            version = "latest"
          }
        }
      }

      # Email OAuth — plain env var
      env {
        name  = "NEXT_PUBLIC_APP_URL"
        value = var.app_url
      }

      # Chat Agent
      env {
        name  = "CHAT_AGENT_URL"
        value = var.chat_agent_url
      }

      # Email OAuth — secrets from Secret Manager
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

  depends_on = [
    google_project_service.apis,
    google_secret_manager_secret_version.secrets,
    google_project_iam_member.frontend_secrets,
  ]
}

# Allow unauthenticated access — public web app, Clerk handles auth at app level
resource "google_cloud_run_v2_service_iam_member" "frontend_public" {
  name     = google_cloud_run_v2_service.frontend.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}
