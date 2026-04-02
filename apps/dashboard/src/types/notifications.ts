// ---------------------------------------------------------------------------
// Notification types — match activity journal + notification DB schema.
// Source: db/migrations/0036_activity_journal_notifications.up.sql
// ---------------------------------------------------------------------------

// ---- Enum unions -----------------------------------------------------------

export type ActivityEventType =
  | "invoice.upload_batch_started"
  | "invoice.ready_for_review"
  | "invoice.processing_failed"
  | "invoice.needs_attention"
  | "invoice.approved"
  | "invoice.exported"
  | "invoice.retry_requested"
  | "invoice.corrected"
  | "invoice.deleted"
  | "member.invite_accepted"
  | "member.invite_declined"
  | "member.role_changed"
  | "member.deactivated"
  | "email.inbox_verification_failed"
  | "email.inbox_auto_paused"
  | "email.inbox_disconnected"
  | "system.config_updated"
  | "platform.user_signup"
  | "platform.org_created"
  | "platform.subscription_changed";

export type NotificationCategory =
  | "invoice"
  | "member"
  | "email"
  | "system"
  | "platform";

export type NotificationSeverity = "info" | "warning" | "critical";

export type NotificationPolicy =
  | "actor_only"
  | "uploader_or_managers"
  | "owners_only"
  | "owners_and_affected"
  | "standard"
  | "platform_admins";

export type NotificationStatus =
  | "pending"
  | "processing"
  | "dispatched"
  | "skipped"
  | "failed";

export type DeliveryStatus =
  | "pending"
  | "sent"
  | "delivered"
  | "failed"
  | "bounced";

// ---- Row types -------------------------------------------------------------

export interface ActivityEvent {
  id: string;
  org_id: string | null;
  actor_user_id: string | null;
  event_type: ActivityEventType;
  category: NotificationCategory;
  severity: NotificationSeverity;
  resource_type: string | null;
  resource_id: string | null;
  notification_policy: NotificationPolicy;
  payload: Record<string, unknown>;
  dedupe_key: string | null;
  notification_status: NotificationStatus;
  last_error: string | null;
  created_at: string;
  processed_at: string | null;
}

export interface UserNotification {
  id: string;
  activity_event_id: string;
  org_id: string;
  recipient_user_id: string;
  recipient_external_id: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  title: string;
  body: string | null;
  cta_url: string | null;
  resource_type: string | null;
  resource_id: string | null;
  is_unread: boolean;
  read_at: string | null;
  dismissed_at: string | null;
  created_at: string;
}

export interface NotificationPreference {
  id: string;
  user_id: string;
  org_id: string;
  category: NotificationCategory;
  in_app_enabled: boolean;
  email_enabled: boolean;
  minimum_severity: NotificationSeverity;
  created_at: string;
  updated_at: string;
}

export interface NotificationDelivery {
  id: string;
  user_notification_id: string | null;
  admin_notification_id: string | null;
  channel: "email";
  provider: string;
  provider_message_id: string | null;
  status: DeliveryStatus;
  error_message: string | null;
  retry_count: number;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

// ---- API response types ----------------------------------------------------

export interface NotificationListResponse {
  data: UserNotification[];
}

export interface UnreadCountResponse {
  count: number;
}

export interface PreferencesResponse {
  data: NotificationPreference[];
}
