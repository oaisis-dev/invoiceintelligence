# Service account for Cloud Run workers
resource "google_service_account" "worker" {
  account_id   = "invoice-worker${local.sa_suffix}"
  display_name = "Invoice Processing Worker"
  description  = "Service account for Cloud Run processing worker and email intake"
}

# Worker SA permissions
resource "google_project_iam_member" "worker_storage" {
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.worker.email}"
}

resource "google_project_iam_member" "worker_pubsub_publisher" {
  project = var.project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.worker.email}"
}

resource "google_project_iam_member" "worker_secrets" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.worker.email}"
}

# Allow Pub/Sub to invoke Cloud Run (for push subscriptions)
resource "google_project_iam_member" "worker_run_invoker" {
  project = var.project_id
  role    = "roles/run.invoker"
  member  = "serviceAccount:${google_service_account.worker.email}"
}

# --- Notification Dispatcher service account ---

resource "google_service_account" "dispatcher" {
  account_id   = "notification-dispatcher${local.sa_suffix}"
  display_name = "Notification Dispatcher"
  description  = "Service account for notification dispatcher Cloud Run service"
}

resource "google_project_iam_member" "dispatcher_secrets" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.dispatcher.email}"
}

# --- Frontend service account ---

resource "google_service_account" "frontend" {
  account_id   = "invoice-frontend${local.sa_suffix}"
  display_name = "Invoice Frontend"
  description  = "Service account for Next.js frontend on Cloud Run"
}

resource "google_project_iam_member" "frontend_storage" {
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.frontend.email}"
}

resource "google_project_iam_member" "frontend_pubsub" {
  project = var.project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.frontend.email}"
}

resource "google_project_iam_member" "frontend_secrets" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.frontend.email}"
}

# --- Admin dashboard service account ---

resource "google_service_account" "admin" {
  account_id   = "invoice-admin${local.sa_suffix}"
  display_name = "Invoice Admin Dashboard"
  description  = "Service account for platform admin dashboard on Cloud Run"
}

resource "google_project_iam_member" "admin_secrets" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.admin.email}"
}

# Allow admin SA to manage frontend service traffic (maintenance mode toggle)
resource "google_cloud_run_v2_service_iam_member" "admin_manage_frontend" {
  name     = google_cloud_run_v2_service.frontend.name
  location = var.region
  role     = "roles/run.developer"
  member   = "serviceAccount:${google_service_account.admin.email}"
}

# Admin SA needs actAs on frontend SA to update the service (required by Cloud Run API)
resource "google_service_account_iam_member" "admin_act_as_frontend" {
  service_account_id = google_service_account.frontend.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.admin.email}"
}

# --- Backend API service account ---

resource "google_service_account" "backend_api" {
  account_id   = "backend-api${local.sa_suffix}"
  display_name = "Backend API"
  description  = "Service account for backend API on Cloud Run"
}

resource "google_project_iam_member" "backend_api_secrets" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.backend_api.email}"
}

# --- GitHub Actions Workload Identity Federation (production only) ---
# CI/CD uses a single deployer SA from production. Staging does not need its own.

locals {
  is_prod_ci = var.environment == "production" && var.github_repo != ""
  is_stg_ci  = var.environment != "production" && var.prod_deployer_email != "" && var.github_repo != ""
}

resource "google_service_account" "github_deployer" {
  count        = local.is_prod_ci ? 1 : 0
  account_id   = "github-deployer"
  display_name = "GitHub Actions Deployer"
  description  = "Used by GitHub Actions via Workload Identity Federation"
}

resource "google_project_iam_member" "deployer_run_admin" {
  count   = local.is_prod_ci ? 1 : 0
  project = var.project_id
  role    = "roles/run.admin"
  member  = "serviceAccount:${google_service_account.github_deployer[0].email}"
}

resource "google_project_iam_member" "deployer_ar_writer" {
  count   = local.is_prod_ci ? 1 : 0
  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${google_service_account.github_deployer[0].email}"
}

# Production: deployer can act as all service SAs in this environment
resource "google_service_account_iam_member" "deployer_act_as_worker" {
  count              = local.is_prod_ci ? 1 : 0
  service_account_id = google_service_account.worker.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.github_deployer[0].email}"
}

resource "google_service_account_iam_member" "deployer_act_as_dispatcher" {
  count              = local.is_prod_ci ? 1 : 0
  service_account_id = google_service_account.dispatcher.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.github_deployer[0].email}"
}

resource "google_service_account_iam_member" "deployer_act_as_frontend" {
  count              = local.is_prod_ci ? 1 : 0
  service_account_id = google_service_account.frontend.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.github_deployer[0].email}"
}

resource "google_service_account_iam_member" "deployer_act_as_admin" {
  count              = local.is_prod_ci ? 1 : 0
  service_account_id = google_service_account.admin.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.github_deployer[0].email}"
}

resource "google_service_account_iam_member" "deployer_act_as_backend_api" {
  count              = local.is_prod_ci ? 1 : 0
  service_account_id = google_service_account.backend_api.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.github_deployer[0].email}"
}

resource "google_iam_workload_identity_pool" "github" {
  count                     = local.is_prod_ci ? 1 : 0
  provider                  = google-beta
  workload_identity_pool_id = "github-actions"
  display_name              = "GitHub Actions"
  description               = "Workload Identity Pool for GitHub Actions CI/CD"
}

resource "google_iam_workload_identity_pool_provider" "github" {
  count                              = local.is_prod_ci ? 1 : 0
  provider                           = google-beta
  workload_identity_pool_id          = google_iam_workload_identity_pool.github[0].workload_identity_pool_id
  workload_identity_pool_provider_id = "github"
  display_name                       = "GitHub"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.actor"      = "assertion.actor"
    "attribute.repository" = "assertion.repository"
  }

  attribute_condition = "assertion.repository == \"${var.github_repo}\""

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

resource "google_service_account_iam_member" "github_wif" {
  count              = local.is_prod_ci ? 1 : 0
  service_account_id = google_service_account.github_deployer[0].name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github[0].name}/attribute.repository/${var.github_repo}"
}

# --- Cross-environment deployer access (staging only) ---
# The prod deployer SA needs actAs on staging SAs to deploy to staging services.

resource "google_service_account_iam_member" "prod_deployer_act_as_worker" {
  count              = local.is_stg_ci ? 1 : 0
  service_account_id = google_service_account.worker.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${var.prod_deployer_email}"
}

resource "google_service_account_iam_member" "prod_deployer_act_as_frontend" {
  count              = local.is_stg_ci ? 1 : 0
  service_account_id = google_service_account.frontend.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${var.prod_deployer_email}"
}

resource "google_service_account_iam_member" "prod_deployer_act_as_admin" {
  count              = local.is_stg_ci ? 1 : 0
  service_account_id = google_service_account.admin.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${var.prod_deployer_email}"
}

resource "google_service_account_iam_member" "prod_deployer_act_as_dispatcher" {
  count              = local.is_stg_ci ? 1 : 0
  service_account_id = google_service_account.dispatcher.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${var.prod_deployer_email}"
}

resource "google_service_account_iam_member" "prod_deployer_act_as_backend_api" {
  count              = local.is_stg_ci ? 1 : 0
  service_account_id = google_service_account.backend_api.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${var.prod_deployer_email}"
}
