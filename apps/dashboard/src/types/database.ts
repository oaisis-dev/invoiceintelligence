// ---------------------------------------------------------------------------
// Database row types — match Supabase/Postgres schema exactly.
// Source of truth: db/migrations/ (see db/README.md for full index)
// ---------------------------------------------------------------------------

// Re-export notification types for convenience
export type {
  ActivityEvent,
  UserNotification,
  NotificationPreference,
  NotificationDelivery,
} from "./notifications";

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

export type ProcessingJobStage = ProcessingStage | "export";

export type InvoiceSource = "web_upload" | "email";

export type UserRole = "admin" | "manager" | "staff";

export type ProcessingJobStatus = "pending" | "running" | "completed" | "failed";

export type WorkspaceType = "individual" | "organization";

export type EmailIngestionStatus =
  | "received"
  | "processing"
  | "completed"
  | "failed";

export type EmailMarkReadStatus = "pending" | "completed" | "failed";

export type EmailAttachmentStatus =
  | "pending"
  | "queued"
  | "skipped"
  | "failed";

export type EmailSenderRecommendationStatus =
  | "pending"
  | "approved"
  | "dismissed";

export type EmailSenderRecommendationSourceReason = "subject_keyword_match";

export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";

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
  file_hash?: string | null;
  metadata: Record<string, unknown>;
  raw_text: string | null;
  confidence_scores: Record<string, unknown> | null;
  error_message: string | null;
  uploaded_by: string | null;
  approved_by: string | null;
  uploaded_at: string;
  processed_at: string | null;
  approved_at: string | null;
  exported_at: string | null;
  rejection_note: string | null;
  progress: number;
  duplicate_status: DuplicateStatus;
  duplicate_of: string | null;
  duplicate_group_id: string | null;
  has_total_mismatch: boolean;
  is_non_invoice: boolean;
  // Normalization (Phase 3+)
  normalization_status: "pending" | "completed" | "failed" | "skipped";
  normalized_with_config_version: number | null;
  needs_reexport: boolean;
  created_at: string;
  updated_at: string;
};

export type InvoiceLineItem = {
  id: string;
  invoice_id: string;
  sort_order: number;
  quantity: number | null;
  size: string | null;
  unit: string | null;
  description: string | null;
  item_code: string | null;
  unit_price: number | null;
  extended_price: number | null;
  tax_amount: number | null;
  category: string | null;
  account: number | null;
  sub_account: number | null;
  extra: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type ProcessingJob = {
  id: string;
  invoice_id: string;
  attempt: number;
  status: ProcessingJobStatus;
  stage: ProcessingJobStage | null;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type OrganizationInvitation = {
  id: string;
  org_id: string;
  email: string;
  role: Extract<UserRole, "admin" | "manager">;
  invited_by_user_id: string | null;
  status: InvitationStatus;
  token_hash: string;
  token_encrypted: string | null;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type EmailIngestion = {
  id: string;
  org_id: string;
  location_id?: string | null;
  message_id: string;
  from_email: string;
  subject: string;
  status: EmailIngestionStatus;
  mark_read_status: EmailMarkReadStatus;
  mark_read_error: string | null;
  marked_read_at: string | null;
  attachment_count: number;
  error_message: string | null;
  received_at: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type EmailAttachment = {
  id: string;
  email_ingestion_id: string;
  invoice_id: string | null;
  filename: string;
  status: EmailAttachmentStatus;
  stored_path: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type EmailAccountProvider = "google" | "microsoft";

export type EmailAccount = {
  id: string;
  org_id: string;
  location_id: string | null;
  provider: EmailAccountProvider;
  email_address: string;
  token_expires_at: string | null;
  subject_filter: string;
  is_active: boolean;
  last_polled_at: string | null;
  last_verified_at: string | null;
  last_verification_status: EmailAccountVerificationStatus;
  last_verification_error: string | null;
  last_error: string | null;
  consecutive_failures: number;
  provider_account_id: string | null;
  provider_metadata: Record<string, unknown>;
  disconnected_at: string | null;
  created_at: string;
  updated_at: string;
};

export type EmailAllowedSender = {
  id: string;
  org_id: string;
  location_id: string | null;
  created_by: string | null;
  email_address: string;
  created_at: string;
  updated_at: string;
};

export type EmailSenderRecommendation = {
  id: string;
  org_id: string;
  location_id: string;
  email_account_id: string | null;
  sender_email: string;
  sender_name: string | null;
  sample_subject: string;
  status: EmailSenderRecommendationStatus;
  source_reason: EmailSenderRecommendationSourceReason;
  first_seen_at: string;
  last_seen_at: string;
  seen_count: number;
  created_at: string;
  updated_at: string;
};

// ---- Composite / joined types ---------------------------------------------

export type DuplicateGroupMember = {
  id: string;
  vendor_name: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  total_amount: number | null;
  status: InvoiceStatus;
  source: InvoiceSource;
  duplicate_status: DuplicateStatus;
  uploaded_at: string;
};

export type InvoiceWithLineItems = Invoice & {
  line_items: InvoiceLineItem[];
  email_context?: {
    from_email: string;
    subject: string;
    received_at: string;
  };
  duplicate_group?: DuplicateGroupMember[];
};


export type AuditActorSummary = {
  id: string;
  email: string | null;
  display_name: string | null;
};

export type AuditChangePayload = Record<string, unknown> | null;

export type InvoiceHistoryEntry = {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  changes: AuditChangePayload;
  created_at: string;
  actor: AuditActorSummary | null;
};

export type EmailAttachmentWithInvoice = EmailAttachment & {
  invoice?: Pick<Invoice, "id" | "status" | "vendor_name"> | null;
};

export type EmailIngestionWithAttachments = EmailIngestion & {
  email_attachments: EmailAttachmentWithInvoice[];
};

// ---- Dashboard stats ------------------------------------------------------

export type DashboardStats = {
  total: number;
  pending: number;
  approved: number;
  failed: number;
  queued: number;
  exported: number;
  processed_today: number;
  suspected_duplicates: number;
  email_invoices: number;
};

// ---- Filter types for queries ---------------------------------------------

export type InvoiceFilters = {
  status?: InvoiceStatus;
  search?: string;
  source?: InvoiceSource | "all";
  duplicateStatus?: DuplicateStatus;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  perPage?: number;
};


export type EmailIngestionFilters = {
  status?: EmailIngestionStatus;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  perPage?: number;
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
  status: "pending" | "contacted" | "resolved";
  created_at: string;
};

export type SubscriptionUsage = {
  monthlyInvoiceCount: number;
  activeUserCount: number;
  monthlyInvoiceLimit: number;
  maxUsers: number;
  workspaceType: string;
  planId: string | null;
  subscriptionStatus: string;
  gracePeriodEnd: string | null;
};
