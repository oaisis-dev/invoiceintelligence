# Outputs for reference and CI/CD

output "worker_url" {
  description = "Cloud Run processing worker URL"
  value       = google_cloud_run_v2_service.worker.uri
}

output "worker_service_account" {
  description = "Service account email used by workers"
  value       = google_service_account.worker.email
}

output "artifact_registry" {
  description = "Artifact Registry repository path"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.workers.repository_id}"
}

output "pubsub_topic" {
  description = "Pub/Sub topic name"
  value       = google_pubsub_topic.invoice_processing.name
}

output "pubsub_subscription" {
  description = "Pub/Sub push subscription name"
  value       = google_pubsub_subscription.worker_push.name
}

output "email_intake_job" {
  description = "Cloud Run Job name for email intake"
  value       = google_cloud_run_v2_job.email_intake.name
}

output "scheduler_job" {
  description = "Cloud Scheduler job name"
  value       = google_cloud_scheduler_job.email_intake.name
}

output "frontend_url" {
  description = "Cloud Run frontend URL"
  value       = google_cloud_run_v2_service.frontend.uri
}

output "frontend_service_account" {
  description = "Service account email used by frontend"
  value       = google_service_account.frontend.email
}

output "mcp_server_url" {
  description = "Cloud Run MCP server URL"
  value       = google_cloud_run_v2_service.mcp_server.uri
}

output "mcp_server_service_account" {
  description = "Service account email used by MCP server"
  value       = google_service_account.mcp_server.email
}
