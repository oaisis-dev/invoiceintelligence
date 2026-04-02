// ---------------------------------------------------------------------------
// Subscription enforcement — provider-agnostic, reads only DB state
// ---------------------------------------------------------------------------

import type { SupabaseClient } from "@supabase/supabase-js";

import type { SubscriptionUsage } from "@/types/database";

export type EnforcementResult = {
  allowed: boolean;
  reason?: string;
  remaining?: number;
};

export async function getSubscriptionUsage(
  supabase: SupabaseClient,
  orgId: string
): Promise<SubscriptionUsage> {
  const { data, error } = await supabase.rpc(
    "get_subscription_usage",
    { p_org_id: orgId }
  );

  if (error) {
    throw new Error(
      `Failed to get subscription usage: ${error.message}`
    );
  }

  // RPC returns an array with one row
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    throw new Error(`Organization not found: ${orgId}`);
  }

  return {
    monthlyInvoiceCount: Number(row.monthly_invoice_count),
    activeUserCount: Number(row.active_user_count),
    monthlyInvoiceLimit: Number(row.monthly_invoice_limit),
    maxUsers: Number(row.max_users),
    workspaceType: row.workspace_type as string,
    planId: row.plan_id as string | null,
    subscriptionStatus: row.subscription_status as string,
    gracePeriodEnd: row.grace_period_end as string | null,
  };
}

export function canUploadInvoices(
  usage: SubscriptionUsage
): EnforcementResult {
  if (isSoftBlocked(usage)) {
    return {
      allowed: false,
      reason:
        "Your subscription payment is overdue and the grace period has expired. Please update your payment method to continue uploading invoices.",
    };
  }

  const remaining =
    usage.monthlyInvoiceLimit - usage.monthlyInvoiceCount;

  if (remaining <= 0) {
    return {
      allowed: false,
      reason: `You have reached your monthly limit of ${usage.monthlyInvoiceLimit} invoices. Upgrade your plan to upload more.`,
      remaining: 0,
    };
  }

  return { allowed: true, remaining };
}

export function canInviteUsers(
  usage: SubscriptionUsage
): EnforcementResult {
  if (usage.workspaceType === "individual") {
    return {
      allowed: false,
      reason:
        "Individual workspaces cannot invite members. Convert to Organization first.",
    };
  }

  const remaining = usage.maxUsers - usage.activeUserCount;

  if (remaining <= 0) {
    return {
      allowed: false,
      reason: `You have reached your limit of ${usage.maxUsers} users. Upgrade your plan to add more team members.`,
      remaining: 0,
    };
  }

  return { allowed: true, remaining };
}

export function isInGracePeriod(usage: SubscriptionUsage): boolean {
  if (usage.subscriptionStatus !== "past_due") return false;
  if (!usage.gracePeriodEnd) return false;
  return new Date(usage.gracePeriodEnd) > new Date();
}

export function isSoftBlocked(usage: SubscriptionUsage): boolean {
  if (usage.subscriptionStatus !== "past_due") return false;
  if (!usage.gracePeriodEnd) return false;
  return new Date(usage.gracePeriodEnd) <= new Date();
}
