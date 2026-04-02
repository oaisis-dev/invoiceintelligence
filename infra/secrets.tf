# Secret Manager secrets for Cloud Run env vars

locals {
  secrets = {
    "${local.secret_prefix}supabase-url"             = var.supabase_url
    "${local.secret_prefix}supabase-secret-key"      = var.supabase_secret_key
    "${local.secret_prefix}gemini-api-key"           = var.gemini_api_key
    "${local.secret_prefix}clerk-secret-key"         = var.clerk_secret_key
    "${local.secret_prefix}clerk-webhook-secret"     = var.clerk_webhook_secret
    "${local.secret_prefix}supabase-publishable-key" = var.supabase_publishable_key
    # Email OAuth
    "${local.secret_prefix}google-oauth-client-id"     = var.google_oauth_client_id
    "${local.secret_prefix}google-oauth-client-secret" = var.google_oauth_client_secret
    "${local.secret_prefix}email-token-encryption-key" = var.email_token_encryption_key
    # Admin Dashboard
    "${local.secret_prefix}admin-auth-secret" = var.admin_auth_secret
    # Backend API — Clerk JWT verification (PEM public key)
    "${local.secret_prefix}clerk-jwt-secret" = var.clerk_jwt_secret
    # Billing / Stripe
    "${local.secret_prefix}stripe-secret-key"     = var.stripe_secret_key
    "${local.secret_prefix}stripe-webhook-secret" = var.stripe_webhook_secret
    # Notification Dispatcher / Brevo
    "${local.secret_prefix}brevo-api-key"      = var.brevo_api_key
    "${local.secret_prefix}brevo-sender-email" = var.brevo_sender_email
    "${local.secret_prefix}brevo-sender-name"  = var.brevo_sender_name
  }
}

resource "google_secret_manager_secret" "secrets" {
  for_each  = local.secrets
  secret_id = each.key

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "secrets" {
  for_each    = local.secrets
  secret      = google_secret_manager_secret.secrets[each.key].id
  secret_data = each.value
}
