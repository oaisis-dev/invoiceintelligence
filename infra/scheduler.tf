# Cloud Scheduler — triggers email intake job every 5 minutes

resource "google_cloud_scheduler_job" "email_intake" {
  name        = "email-intake-trigger${local.name_suffix}"
  description = "Triggers email intake Cloud Run Job every 5 minutes"
  schedule    = "*/5 * * * *"
  time_zone   = "America/New_York"

  http_target {
    http_method = "POST"
    uri         = "https://${var.region}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${var.project_id}/jobs/${google_cloud_run_v2_job.email_intake.name}:run"

    oauth_token {
      service_account_email = google_service_account.worker.email
      scope                 = "https://www.googleapis.com/auth/cloud-platform"
    }
  }

  depends_on = [google_project_service.apis]
}

# Cloud Scheduler — notification reconciler every 2 minutes
resource "google_cloud_scheduler_job" "notification_reconcile" {
  name        = "notification-reconcile${local.name_suffix}"
  description = "Picks up stale pending/processing notification events every 2 minutes"
  schedule    = "*/2 * * * *"
  time_zone   = "America/New_York"

  http_target {
    http_method = "POST"
    uri         = "${google_cloud_run_v2_service.dispatcher.uri}/reconcile"

    oidc_token {
      service_account_email = google_service_account.dispatcher.email
      audience              = google_cloud_run_v2_service.dispatcher.uri
    }
  }

  depends_on = [google_project_service.apis]
}
