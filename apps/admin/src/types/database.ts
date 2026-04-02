// ---------------------------------------------------------------------------
// Database row types -- match Supabase/Postgres schema exactly.
// Copied from frontend/client/src/types/database.ts + platform admin types.
// ---------------------------------------------------------------------------

// ---- Status / enum union types --------------------------------------------

export type InvoiceStatus =
  | "uploaded"
  | "queued"
  | "processing"
  | "ready_for_review"
  | "failed"
  | "cancelled"
  | "approved"
  | "exported";

export type ProcessingStage =
  | "rotate_pdf"
  | "ocr"
  | "extraction"
  | "verification"
  | "duplicate_check"
  | "validation"
  | "classification";

export type DuplicateStatus =
  | "unchecked"
  | "none"
  | "suspected"
  | "confirmed_duplicate"
  | "dismissed";

export type InvoiceSource = "web_upload" | "email";

export type UserRole = "admin" | "manager" | "staff";

export type ProcessingJobStatus = "pending" | "running" | "completed" | "failed";

export type WorkspaceType = "individual" | "organization";

export type EmailIngestionStatus =
  | "received"
  | "processing"
  | "completed"
  | "failed";

export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";

export type EmailAccountProvider = "google" | "microsoft";

export type EmailAccountVerificationStatus =
  | "unverified"
  | "verified"
  | "failed";

export type SubscriptionTier = "free" | "pro" | "enterprise" | (string & {});

export type SubscriptionStatus = "active" | "past_due" | "canceled";

export type PaymentProviderType = "stripe";

// ---- Row types ------------------------------------------------------------

export type Organization = {
  id: string;
  name: string;
  slug: string;
  workspace_type: WorkspaceType;
  logo_url: string | null;
  settings: Record<string, unknown>;
  plan_id: string | null;
  payment_customer_id: string | null;
  payment_subscription_id: string | null;
  payment_provider: PaymentProviderType | null;
  subscription_status: SubscriptionStatus;
  grace_period_end: string | null;
  monthly_invoice_limit: number;
  max_users: number;
  created_at: string;
  updated_at: string;
};

export type Location = {
  id: string;
  org_id: string;
  name: string;
  address: string | null;
  is_active: boolean;
  is_default: boolean;
  intake_email?: string | null;
  intake_enabled?: boolean;
  created_at: string;
  updated_at: string;
};

export type User = {
  id: string;
  org_id: string;
  location_id: string | null;
  external_id: string;
  clerk_dev_id?: string | null;
  clerk_prod_id?: string | null;
  email: string;
  display_name: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Invoice = {
  id: string;
  org_id: string;
  location_id: string | null;
  status: InvoiceStatus;
  processing_stage: ProcessingStage | null;
  source: InvoiceSource;
  vendor_name: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  total_amount: number | null;
  original_filename: string;
  stored_path: string;
  metadata: Record<string, unknown>;
  error_message: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
  processed_at: string | null;
  approved_at: string | null;
  duplicate_status: DuplicateStatus;
  has_total_mismatch: boolean;
  is_non_invoice: boolean;
  created_at: string;
  updated_at: string;
};

export type EmailAccount = {
  id: string;
  org_id: string;
  location_id: string | null;
  provider: EmailAccountProvider;
  email_address: string;
  is_active: boolean;
  last_polled_at: string | null;
  last_verified_at: string | null;
  last_verification_status: EmailAccountVerificationStatus;
  consecutive_failures: number;
  created_at: string;
  updated_at: string;
};

export type OrganizationInvitation = {
  id: string;
  org_id: string;
  email: string;
  role: Extract<UserRole, "admin" | "manager">;
  status: InvitationStatus;
  created_at: string;
  updated_at: string;
};

// ---- Platform admin types (new) -------------------------------------------

export type PlatformAdminPermission =
  | "read_orgs"
  | "manage_billing"
  | "impersonate"
  | "manage_plans"
  | "view_audit_logs"
  | "manage_platform";

export type PlatformAdmin = {
  id: string;
  email: string;
  display_name: string | null;
  permissions: PlatformAdminPermission[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type PlatformSetting = {
  key: string;
  value: unknown;
  description: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

// ---- Composite types for admin queries ------------------------------------

export type OrganizationWithCounts = Organization & {
  member_count: number;
  invoice_count: number;
  location_count: number;
};

export type UserWithOrg = User & {
  organization: Pick<Organization, "name" | "slug">;
};

export type PlatformStats = {
  total_orgs: number;
  total_users: number;
  total_invoices: number;
  invoices_this_week: number;
  paid_orgs?: number;
  pending_contact_requests?: number;
};

// ---- Subscription / billing types -----------------------------------------

export type SubscriptionPlan = {
  id: string;
  workspace_type: WorkspaceType;
  tier: SubscriptionTier;
  display_name: string;
  monthly_invoice_limit: number;
  max_users: number;
  price_cents: number;
  payment_price_id: string | null;
  features: string[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  promo_price_dollars: number | null;
  promo_label: string | null;
  promo_max_slots: number | null;
  promo_payment_price_id: string | null;
};

export type ContactRequest = {
  id: string;
  org_id: string | null;
  name: string;
  email: string;
  message: string | null;
  business_name: string | null;
  demo_requested: boolean;
  status: "pending" | "contacted" | "resolved";
  created_at: string;
};

export type SubscriptionUsage = {
  monthly_invoice_count: number;
  active_user_count: number;
  monthly_invoice_limit: number;
  max_users: number;
  workspace_type: string;
  plan_id: string | null;
  subscription_status: string;
  grace_period_end: string | null;
};
