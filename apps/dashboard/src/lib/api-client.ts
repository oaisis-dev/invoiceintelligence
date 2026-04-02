import type {
  Invoice,
  InvoiceLineItem,
  InvoiceStatus,
  ProcessingStage,
  Location,
  Organization,
  EmailAllowedSender,
  EmailSenderRecommendation,
} from "@/types/database";

// ---------------------------------------------------------------------------
// Client-side mutation helpers.
// These call Next.js API routes (NOT FastAPI directly). The Next.js route
// handlers forward requests to the backend with proper auth headers.
// ---------------------------------------------------------------------------

/** Typed error class for API responses */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      message = body?.error?.message ?? body?.error ?? body?.detail ?? message;
    } catch {
      // Response body was not JSON; use the default message.
    }
    throw new ApiError(message, res.status);
  }
  // 204 No Content — nothing to parse
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

// ---- Invoice mutations ----------------------------------------------------

export type UploadResult = {
  uploaded: number;
  skipped_duplicates?: number;
  failed?: number;
  invoiceIds: string[];
  results?: UploadResultItem[];
  partial_errors?: string[];
};

export type UploadResultItem = {
  fileName?: string;
  filename?: string;
  fileId?: string;
  duplicateOf?: string;
  duplicateUploadedAt?: string;
  invoiceId?: string | null;
  id?: string | null;
  file_id?: string | null;
  status: InvoiceStatus | "queued" | "failed" | "skipped_duplicate";
  error?: string;
  reason?: string | null;
};

export type InvoiceStatusPayload = {
  id: string;
  status: InvoiceStatus;
  progress: number | null;
  processing_stage: ProcessingStage | null;
  error_message: string | null;
  updated_at?: string;
};

/**
 * Upload one or more PDF files for processing.
 */
export async function uploadInvoices(
  files: File[],
  fileIds?: string[]
): Promise<UploadResult> {
  const formData = new FormData();
  for (const [index, file] of files.entries()) {
    formData.append("files", file);
    if (fileIds?.[index]) {
      formData.append("file_ids", fileIds[index]);
    }
  }

  const res = await fetch("/api/invoices/upload", {
    method: "POST",
    body: formData,
    // Do NOT set Content-Type — browser sets it with the boundary
  });

  return handleResponse<UploadResult>(res);
}

/**
 * Fetch current status/progress for an invoice.
 */
export async function getInvoiceStatus(id: string): Promise<InvoiceStatusPayload> {
  const res = await fetch(`/api/invoices/${id}/status`, {
    method: "GET",
  });
  return handleResponse<InvoiceStatusPayload>(res);
}

/**
 * Approve a reviewed invoice.
 */
export async function approveInvoice(id: string): Promise<void> {
  const res = await fetch(`/api/invoices/${id}/approve`, {
    method: "POST",
  });
  await handleResponse<void>(res);
}

/**
 * Export an approved invoice. Returns a Blob (Excel file).
 */
export async function exportInvoice(id: string): Promise<Blob> {
  const res = await fetch(`/api/invoices/${id}/export`, {
    method: "POST",
  });

  if (!res.ok) {
    let message = `Export failed (${res.status})`;
    try {
      const body = await res.json();
      message = body?.error?.message ?? body?.error ?? body?.detail ?? message;
    } catch {
      // not JSON
    }
    throw new ApiError(message, res.status);
  }

  return res.blob();
}

/**
 * Retry a failed invoice — resets status and re-publishes to Pub/Sub.
 */
export async function retryInvoice(id: string): Promise<void> {
  const res = await fetch(`/api/invoices/${id}/retry`, {
    method: "POST",
  });
  await handleResponse<void>(res);
}

/**
 * Permanently delete an invoice and its associated data.
 */
export async function deleteInvoice(id: string): Promise<void> {
  const res = await fetch(`/api/invoices/${id}`, {
    method: "DELETE",
  });
  await handleResponse<void>(res);
}

/**
 * Update invoice metadata (user corrections during review).
 */
export async function updateInvoice(
  id: string,
  data: Partial<Invoice> & { line_items?: Partial<InvoiceLineItem>[] }
): Promise<Invoice> {
  const res = await fetch(`/api/invoices/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<Invoice>(res);
}

/**
 * Submit reviewer corrections and detect recommendations.
 * Called after saving invoice edits to create org-level recommendations.
 */
export async function saveReviewCorrections(
  invoiceId: string,
  data: {
    vendor_name: string | null;
    original: Record<string, unknown>;
    corrected: Record<string, unknown>;
  }
): Promise<{ corrections_detected: number; corrections: Array<{ type: string; details: Record<string, unknown> }> }> {
  const res = await fetch(`/api/invoices/${invoiceId}/save-review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

/**
 * Export all invoice line items grouped by category. Returns a Blob (Excel file).
 */
export async function exportByCategory(filters: {
  status?: string;
  search?: string;
  source?: string;
  duplicateStatus?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<Blob> {
  const res = await fetch("/api/invoices/export-by-category", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(filters),
  });

  if (!res.ok) {
    let message = `Export failed (${res.status})`;
    try {
      const body = await res.json();
      message = body?.error?.message ?? body?.error ?? body?.detail ?? message;
    } catch {
      // not JSON
    }
    throw new ApiError(message, res.status);
  }

  return res.blob();
}

/**
 * Run an on-demand duplicate check for an invoice.
 */
export async function checkDuplicate(
  id: string
): Promise<{ duplicate_status: string; match_count: number }> {
  const res = await fetch(`/api/invoices/${id}/check-duplicate`, {
    method: "POST",
  });
  return handleResponse<{ duplicate_status: string; match_count: number }>(res);
}

/**
 * Resolve a suspected duplicate: dismiss the warning or confirm as duplicate.
 */
export async function resolveDuplicate(
  id: string,
  action: "dismiss" | "confirm_duplicate"
): Promise<void> {
  const res = await fetch(`/api/invoices/${id}/resolve-duplicate`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
  await handleResponse<void>(res);
}

// ---- Organization settings mutations --------------------------------------

export type SettingsLocation = Pick<Location, "id" | "name" | "is_active">;

export type SettingsPayload = {
  organization: Organization;
  locations: SettingsLocation[];
};

/**
 * Update org-level settings (name, logo, preferences).
 */
export async function updateOrgSettings(
  data: { name?: string; settings?: Record<string, unknown> }
): Promise<SettingsPayload> {
  const res = await fetch("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<SettingsPayload>(res);
}

// ---- Email account mutations ------------------------------------------------

export type EmailAccountPayload = {
  accounts: Array<{
    id: string;
    org_id: string;
    location_id: string | null;
    provider: string;
    email_address: string;
    token_expires_at: string | null;
    subject_filter: string;
    is_active: boolean;
    last_polled_at: string | null;
    last_verified_at: string | null;
    last_verification_status: string;
    last_verification_error: string | null;
    last_error: string | null;
    consecutive_failures: number;
    disconnected_at: string | null;
    location: {
      id: string;
      name: string;
      is_default: boolean;
    } | null;
    created_at: string;
    updated_at: string;
  }>;
  sender_policy: {
    mode: "discovery" | "enforcement";
    effective_scope: "org" | "location" | "none";
    discovery_keywords: string[];
    default_location: {
      id: string;
      name: string;
    };
    org_allowed_senders: EmailAllowedSender[];
    location_allowed_senders: EmailAllowedSender[];
  };
  recommendations: EmailSenderRecommendation[];
};

export type OrganizationMemberPayload = {
  currentUserId: string;
  members: Array<{
    id: string;
    email: string;
    display_name: string | null;
    role: "admin" | "manager";
    is_active: boolean;
    created_at: string;
    updated_at: string;
  }>;
  invitations: Array<{
    id: string;
    org_id: string;
    organization_name: string;
    organization_slug: string;
    workspace_type: "individual" | "organization";
    email: string;
    role: "admin" | "manager";
    status: "pending" | "accepted" | "revoked" | "expired";
    expires_at: string;
    accepted_at: string | null;
    revoked_at: string | null;
    created_at: string;
    updated_at: string;
    invited_by_user_id: string | null;
    invited_by_label: string | null;
    invite_url: string;
  }>;
};

/**
 * Fetch all connected email accounts for the current org.
 */
export async function getEmailAccounts(): Promise<EmailAccountPayload> {
  const res = await fetch("/api/settings/email-accounts", { method: "GET" });
  return handleResponse<EmailAccountPayload>(res);
}

/**
 * Start the OAuth flow — returns an authorization URL to redirect to.
 */
export async function connectEmailAccount(
  provider: "google" | "microsoft",
  locationId?: string | null
): Promise<{ authorization_url: string }> {
  const params = new URLSearchParams({ provider });
  if (locationId) params.set("location_id", locationId);

  const res = await fetch(
    `/api/settings/email-accounts/connect?${params.toString()}`,
    { method: "POST" }
  );
  return handleResponse<{ authorization_url: string }>(res);
}

/**
 * Update an email account's configuration.
 */
export async function updateEmailAccount(
  id: string,
  data: { subject_filter?: string; is_active?: boolean; location_id?: string | null }
): Promise<{ account: EmailAccountPayload["accounts"][0] }> {
  const res = await fetch(`/api/settings/email-accounts/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<{ account: EmailAccountPayload["accounts"][0] }>(res);
}

/**
 * Run a dry verification of the currently connected inbox.
 */
export async function testEmailAccount(id: string): Promise<{
  verification: {
    status: "verified" | "failed";
    message: string;
    verified_at: string;
  };
  account?: EmailAccountPayload["accounts"][0];
}> {
  const res = await fetch(`/api/settings/email-accounts/${id}/test`, {
    method: "POST",
  });
  return handleResponse<{
    verification: {
      status: "verified" | "failed";
      message: string;
      verified_at: string;
    };
    account?: EmailAccountPayload["accounts"][0];
  }>(res);
}

/**
 * Disconnect (delete) an email account.
 */
export async function deleteEmailAccount(id: string): Promise<void> {
  const res = await fetch(`/api/settings/email-accounts/${id}`, {
    method: "DELETE",
  });
  await handleResponse<void>(res);
}

export async function createAllowedSender(data: {
  scope: "org" | "location";
  email_address: string;
}): Promise<{ sender: EmailAllowedSender | null }> {
  const res = await fetch("/api/settings/email-accounts/allowed-senders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<{ sender: EmailAllowedSender | null }>(res);
}

export async function deleteAllowedSender(id: string): Promise<void> {
  const res = await fetch(`/api/settings/email-accounts/allowed-senders/${id}`, {
    method: "DELETE",
  });
  await handleResponse<void>(res);
}

export async function updateSenderRecommendation(
  id: string,
  action: "approve_org" | "approve_location" | "dismiss"
): Promise<{
  recommendation: EmailSenderRecommendation | null;
  sender?: EmailAllowedSender | null;
}> {
  const res = await fetch(`/api/settings/email-accounts/recommendations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
  return handleResponse<{
    recommendation: EmailSenderRecommendation | null;
    sender?: EmailAllowedSender | null;
  }>(res);
}

// ---- Member + invite mutations --------------------------------------------

export async function getOrganizationMembers(): Promise<OrganizationMemberPayload> {
  const res = await fetch("/api/settings/members", { method: "GET" });
  return handleResponse<OrganizationMemberPayload>(res);
}

export async function createOrganizationInvitation(data: {
  email: string;
  role: "admin" | "manager";
}): Promise<{ invitation: OrganizationMemberPayload["invitations"][0]; created: boolean }> {
  const res = await fetch("/api/settings/members", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<{ invitation: OrganizationMemberPayload["invitations"][0]; created: boolean }>(res);
}

export async function updateOrganizationInvitation(
  id: string,
  action: "resend" | "revoke"
): Promise<{ invitation: OrganizationMemberPayload["invitations"][0] }> {
  const res = await fetch(`/api/settings/members/invitations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
  return handleResponse<{ invitation: OrganizationMemberPayload["invitations"][0] }>(res);
}

export async function updateOrganizationMember(
  id: string,
  data: { role: "admin" | "manager" }
): Promise<{ member: OrganizationMemberPayload["members"][0] }> {
  const res = await fetch(`/api/settings/members/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<{ member: OrganizationMemberPayload["members"][0] }>(res);
}

export async function deactivateOrganizationMember(id: string): Promise<void> {
  const res = await fetch(`/api/settings/members/${id}`, {
    method: "DELETE",
  });
  await handleResponse<void>(res);
}

// ---- Notification mutations ------------------------------------------------

import type {
  UserNotification,
  NotificationListResponse,
  UnreadCountResponse,
  NotificationPreference,
  PreferencesResponse,
} from "@/types/notifications";

export async function getNotifications(params?: {
  cursor?: string;
  category?: string;
  unread_only?: boolean;
  limit?: number;
}): Promise<NotificationListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.cursor) searchParams.set("cursor", params.cursor);
  if (params?.category) searchParams.set("category", params.category);
  if (params?.unread_only) searchParams.set("unread_only", "true");
  if (params?.limit) searchParams.set("limit", String(params.limit));

  const qs = searchParams.toString();
  const res = await fetch(`/api/notifications${qs ? `?${qs}` : ""}`, {
    method: "GET",
  });
  return handleResponse<NotificationListResponse>(res);
}

export async function getUnreadCount(): Promise<UnreadCountResponse> {
  const res = await fetch("/api/notifications/unread-count", { method: "GET" });
  return handleResponse<UnreadCountResponse>(res);
}

export async function markNotificationsRead(
  ids: string[]
): Promise<void> {
  const res = await fetch("/api/notifications/mark-read", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notification_ids: ids }),
  });
  await handleResponse<void>(res);
}

export async function markAllNotificationsRead(): Promise<void> {
  const res = await fetch("/api/notifications/mark-all-read", {
    method: "POST",
  });
  await handleResponse<void>(res);
}

export async function dismissNotifications(
  ids: string[]
): Promise<void> {
  const res = await fetch("/api/notifications/dismiss", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notification_ids: ids }),
  });
  await handleResponse<void>(res);
}

export async function getNotificationPreferences(): Promise<PreferencesResponse> {
  const res = await fetch("/api/notifications/preferences", { method: "GET" });
  return handleResponse<PreferencesResponse>(res);
}

export async function updateNotificationPreference(
  preference: Pick<
    NotificationPreference,
    "category" | "in_app_enabled" | "email_enabled" | "minimum_severity"
  >
): Promise<{ data: NotificationPreference }> {
  const res = await fetch("/api/notifications/preferences", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(preference),
  });
  return handleResponse<{ data: NotificationPreference }>(res);
}

export type { UserNotification, NotificationPreference };
