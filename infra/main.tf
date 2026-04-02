terraform {
  required_version = ">= 1.5"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
  }

  backend "gcs" {
    bucket = "invoice-intel-tf-state"
    # prefix set per-environment via CLI:
    #   terraform init -backend-config="prefix=terraform/staging"
    #   terraform init -backend-config="prefix=terraform/production"
  }
}

# --- Environment-aware naming ---
locals {
  # Empty for production (keeps current names), "-staging" for staging
  name_suffix = var.environment == "production" ? "" : "-${var.environment}"
  # Short suffix for service account IDs (30-char limit)
  sa_suffix = var.environment == "production" ? "" : "-stg"
  # Prefix for Secret Manager secret IDs
  secret_prefix = var.environment == "production" ? "" : "${var.environment}-"
  # Docker image tag — CI/CD only builds staging-* tags; production is promoted via deploy
  image_tag = "staging-latest"
}

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# Enable required GCP APIs
resource "google_project_service" "apis" {
  for_each = toset([
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "pubsub.googleapis.com",
    "storage.googleapis.com",
    "vision.googleapis.com",
    "secretmanager.googleapis.com",
    "cloudscheduler.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
  ])

  service            = each.value
  disable_on_destroy = false
}
