resource "google_artifact_registry_repository" "workers" {
  location      = var.region
  repository_id = "invoice-intelligence"
  description   = "Docker images for invoice processing workers"
  format        = "DOCKER"

  cleanup_policies {
    id     = "keep-recent"
    action = "KEEP"

    most_recent_versions {
      keep_count = 10
    }
  }

  depends_on = [google_project_service.apis]
}
