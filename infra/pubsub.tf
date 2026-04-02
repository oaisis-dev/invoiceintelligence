# Pub/Sub topic + push subscription to Cloud Run worker

resource "google_pubsub_topic" "invoice_processing" {
  name = var.pubsub_topic_name

  message_retention_duration = "86400s" # 24 hours

  depends_on = [google_project_service.apis]
}

resource "google_pubsub_subscription" "worker_push" {
  name  = "${var.pubsub_topic_name}-push"
  topic = google_pubsub_topic.invoice_processing.id

  ack_deadline_seconds = 600 # 10 min — matches Cloud Run timeout

  push_config {
    push_endpoint = "${google_cloud_run_v2_service.worker.uri}/process"

    oidc_token {
      service_account_email = google_service_account.worker.email
    }

    attributes = {
      x-goog-version = "v1"
    }
  }

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }

  # Dead-letter after 10 failed attempts
  expiration_policy {
    ttl = "" # never expires
  }

  depends_on = [google_project_service.apis]
}

# --- Notification dispatch topic + push subscription ---

resource "google_pubsub_topic" "notification_dispatch" {
  name = "notification-dispatch${local.name_suffix}"

  message_retention_duration = "86400s" # 24 hours

  depends_on = [google_project_service.apis]
}

resource "google_pubsub_subscription" "dispatcher_push" {
  name  = "notification-dispatch${local.name_suffix}-push"
  topic = google_pubsub_topic.notification_dispatch.id

  ack_deadline_seconds = 30 # lightweight dispatch — 30s is sufficient

  push_config {
    push_endpoint = "${google_cloud_run_v2_service.dispatcher.uri}/dispatch"

    oidc_token {
      service_account_email = google_service_account.dispatcher.email
    }

    attributes = {
      x-goog-version = "v1"
    }
  }

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "300s"
  }

  expiration_policy {
    ttl = "" # never expires
  }

  depends_on = [google_project_service.apis]
}
