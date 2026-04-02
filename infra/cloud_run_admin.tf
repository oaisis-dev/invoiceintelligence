# Admin Dashboard — Cloud Run Service
# Public access -- Google OAuth + platform_admins table handles auth at app level.

locals {
  admin_image = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.workers.repository_id}/invoice-admin:${local.image_tag}"
}

resource "google_cloud_run_v2_service" "admin" {
  name     = "invoice-admin${local.name_suffix}"
  location = var.region

  template {
    service_account = google_service_account.admin.email

    scaling {
      min_instance_count = 0
      max_instance_count = var.max_instances_default
    }

    timeout = "60s"

    containers {
      image = local.admin_image

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
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "HOSTNAME"
        value = "0.0.0.0"
      }
      # Maintenance mode — admin manages frontend traffic via Cloud Run API
      env {
        name  = "GCP_PROJECT_ID"
        value = var.project_id
      }
      env {
        name  = "GCP_REGION"
        value = var.region
      }
      env {
        name  = "FRONTEND_SERVICE_NAME"
        value = google_cloud_run_v2_service.frontend.name
      }
      env {
        name  = "NEXT_PUBLIC_GOOGLE_CLIENT_ID"
        value = var.google_oauth_admin_client_id
      }
      env {
        name  = "BACKEND_API_URL"
        value = var.backend_api_url
      }

      # Secrets from Secret Manager
      env {
        name = "AUTH_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["${local.secret_prefix}admin-auth-secret"].secret_id
            version = "latest"
          }
        }
      }
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
    }
  }

  depends_on = [
    google_project_service.apis,
    google_secret_manager_secret_version.secrets,
    google_project_iam_member.admin_secrets,
  ]
}

# Allow unauthenticated access -- app-level auth via Google OAuth + platform_admins
resource "google_cloud_run_v2_service_iam_member" "admin_public" {
  name     = google_cloud_run_v2_service.admin.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Custom domain mapping (requires domain verification in Google Search Console)
resource "google_cloud_run_domain_mapping" "admin" {
  count    = var.admin_domain != "" ? 1 : 0
  name     = var.admin_domain
  location = var.region

  metadata {
    namespace = var.project_id
  }

  spec {
    route_name = google_cloud_run_v2_service.admin.name
  }
}
