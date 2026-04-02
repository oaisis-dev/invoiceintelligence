variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region for all resources"
  type        = string
}

variable "environment" {
  description = "Environment name (staging, production)"
  type        = string

  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be 'staging' or 'production'."
  }
}

variable "gcs_bucket_name" {
  description = "GCS bucket for invoice PDFs"
  type        = string
}

variable "pubsub_topic_name" {
  description = "Pub/Sub topic for invoice processing"
  type        = string
}

variable "github_repo" {
  description = "GitHub repository (owner/repo) for Workload Identity Federation"
  type        = string
}

variable "prod_deployer_email" {
  description = "Production deployer SA email — needed so staging SAs can be deployed by the shared GitHub Actions credential"
  type        = string
  default     = ""
}

# Secrets — passed via tfvars or CLI, never committed
variable "supabase_url" {
  description = "Supabase project URL"
  type        = string
  sensitive   = true
}

variable "supabase_secret_key" {
  description = "Supabase secret key (formerly service_role key)"
  type        = string
  sensitive   = true
}

variable "gemini_api_key" {
  description = "Google Gemini API key"
  type        = string
  sensitive   = true
}


# --- Frontend (Clerk + Supabase anon) ---

variable "clerk_secret_key" {
  description = "Clerk secret key for Next.js auth"
  type        = string
  sensitive   = true
}

variable "clerk_webhook_secret" {
  description = "Clerk webhook signing secret"
  type        = string
  sensitive   = true
}

variable "clerk_publishable_key" {
  description = "Clerk publishable key (NEXT_PUBLIC, not sensitive — embedded in client JS)"
  type        = string
}

variable "clerk_domain" {
  description = "Clerk production domain (e.g. clerk.openoaisis.com)"
  type        = string
}

variable "supabase_publishable_key" {
  description = "Supabase publishable key (formerly anon key)"
  type        = string
}

# --- Email OAuth (Gmail API) ---

variable "google_oauth_client_id" {
  description = "Google OAuth client ID for email intake authentication"
  type        = string
  sensitive   = true
}

variable "google_oauth_client_secret" {
  description = "Google OAuth client secret for email intake authentication"
  type        = string
  sensitive   = true
}

variable "email_token_encryption_key" {
  description = "AES-256-GCM encryption key for OAuth tokens (64 hex chars)"
  type        = string
  sensitive   = true
}

variable "app_url" {
  description = "Public app URL for OAuth redirect URIs (e.g. https://openoaisis.com)"
  type        = string
}

variable "admin_domain" {
  description = "Custom domain for admin dashboard (e.g. ii-admin.openoaisis.com)"
  type        = string
  default     = ""
}

# --- Billing / Stripe ---

variable "stripe_secret_key" {
  description = "Stripe secret key for server-side API calls"
  type        = string
  sensitive   = true
}

variable "stripe_webhook_secret" {
  description = "Stripe webhook signing secret"
  type        = string
  sensitive   = true
}

variable "stripe_publishable_key" {
  description = "Stripe publishable key (NEXT_PUBLIC, embedded in client JS)"
  type        = string
}

variable "payment_provider" {
  description = "Payment provider name (stripe, paddle, etc.)"
  type        = string
}

# --- Admin Dashboard ---

variable "google_oauth_admin_client_id" {
  description = "Google OAuth Client ID for admin dashboard login"
  type        = string
}

variable "admin_auth_secret" {
  description = "JWT signing secret for admin dashboard sessions (base64, 256-bit)"
  type        = string
  sensitive   = true
}

variable "clerk_jwt_secret" {
  description = "Clerk PEM public key for verifying Clerk-issued JWTs in backend-api"
  type        = string
  sensitive   = true
  default     = ""
}

# --- Notification Dispatcher / Email ---

variable "email_provider" {
  description = "Email provider for notification delivery (brevo or console)"
  type        = string
  default     = "console"
}

variable "brevo_api_key" {
  description = "Brevo transactional email API key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "brevo_sender_email" {
  description = "Brevo sender email address"
  type        = string
  default     = ""
}

variable "brevo_sender_name" {
  description = "Brevo sender display name"
  type        = string
  default     = "Invoice Intelligence"
}

# --- Backend API ---

variable "backend_api_url" {
  description = "URL of the backend-api Cloud Run service"
  type        = string
}

# --- Chat Agent ---

variable "chat_agent_url" {
  description = "URL of the Invoice Chat Agent Cloud Run service"
  type        = string
}

# --- Scaling ---

variable "max_instances_worker" {
  description = "Max Cloud Run instances for processing worker"
  type        = number
  default     = 5
}

variable "max_instances_frontend" {
  description = "Max Cloud Run instances for frontend"
  type        = number
  default     = 3
}

variable "max_instances_default" {
  description = "Max Cloud Run instances for other services (admin, dispatcher, mcp)"
  type        = number
  default     = 3
}
