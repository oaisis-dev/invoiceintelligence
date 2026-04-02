import "server-only";

import { fetchFromBackendApi } from "@/lib/backend-api";
import type { SubscriptionPlan, SubscriptionUsage } from "@/types/database";

export async function listPlans(): Promise<SubscriptionPlan[]> {
  return fetchFromBackendApi<SubscriptionPlan[]>("/api/admin/subscription-plans");
}

export async function upsertPlan(
  plan: Partial<SubscriptionPlan> & { id?: string }
): Promise<SubscriptionPlan> {
  return fetchFromBackendApi<SubscriptionPlan>("/api/admin/subscription-plans", {
    method: "POST",
    body: plan,
  });
}

export async function getOrgSubscription(orgId: string): Promise<{
  org: Record<string, unknown>;
  plan: SubscriptionPlan | null;
  usage: SubscriptionUsage | null;
}> {
  return fetchFromBackendApi<{
    org: Record<string, unknown>;
    plan: SubscriptionPlan | null;
    usage: SubscriptionUsage | null;
  }>(`/api/admin/organizations/${orgId}/subscription`);
}

export async function updateOrgSubscription(
  orgId: string,
  updates: {
    plan_id?: string;
    monthly_invoice_limit?: number;
    max_users?: number;
    subscription_status?: string;
    grace_period_end?: string | null;
  }
): Promise<void> {
  await fetchFromBackendApi<{ success: boolean }>(
    `/api/admin/organizations/${orgId}/subscription`,
    { method: "PUT", body: updates }
  );
}
