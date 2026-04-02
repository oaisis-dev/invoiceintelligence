# MCP Server — Cloud Run Service (Bun + Hono)
# Standalone service exposing Supabase data as MCP tools.
# Agents authenticate via Cloud Run IAM (run.invoker).
# Migrated from Python to Bun — see apps/mcp-server/Dockerfile

locals {
  mcp_image = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.workers.repository_id}/invoice-mcp:${local.image_tag}"
}

resource "google_service_account" "mcp_server" {
  account_id   = "invoice-mcp${local.sa_suffix}"
  display_name = "Invoice MCP Server"
  description  = "Service account for MCP server on Cloud Run"
}

resource "google_project_iam_member" "mcp_secrets" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.mcp_server.email}"
}

resource "google_cloud_run_v2_service" "mcp_server" {
  name     = "invoice-mcp${local.name_suffix}"
  location = var.region

  template {
    service_account = google_service_account.mcp_server.email

    scaling {
      min_instance_count = 0
      max_instance_count = var.max_instances_default
    }

    timeout = "300s"

    containers {
      image = local.mcp_image

      ports {
        container_port = 8080
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      env {
        name  = "LOG_LEVEL"
        value = "INFO"
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
  ]
}

# Allow the worker SA to invoke the MCP server (agent-to-MCP auth)
resource "google_cloud_run_v2_service_iam_member" "worker_invokes_mcp" {
  name     = google_cloud_run_v2_service.mcp_server.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.worker.email}"
}

# Production: deployer can act as the MCP SA
resource "google_service_account_iam_member" "deployer_act_as_mcp" {
  count              = local.is_prod_ci ? 1 : 0
  service_account_id = google_service_account.mcp_server.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.github_deployer[0].email}"
}

# Staging: prod deployer can act as the MCP SA
resource "google_service_account_iam_member" "prod_deployer_act_as_mcp" {
  count              = local.is_stg_ci ? 1 : 0
  service_account_id = google_service_account.mcp_server.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${var.prod_deployer_email}"
}
