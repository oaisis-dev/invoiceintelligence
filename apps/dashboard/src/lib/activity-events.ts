/**
 * Activity event helpers — single source of truth for audit + notifications.
 *
 * Two variants:
 * - appendActivityEvent(): for routes that use requireAuthContext() —
 *   proxies through backend-api which handles DB write + Pub/Sub publish.
 * - appendActivityEventAdmin(): for routes without standard auth context
 *   (claim, decline, onboarding) — calls backend-api internal endpoint.
 *
 * Both are fire-and-forget: failures are logged, never block the caller.
 */

import { proxyToBackendApi } from "@/lib/backend-api";

const BACKEND_API_URL =
  process.env.BACKEND_API_URL ?? "http://localhost:8001";
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY ?? "";

type ActivityEventParams = {
  eventType: string;
  category: string;
  severity: string;
  resourceType?: string;
  resourceId?: string;
  notificationPolicy: string;
  payload?: Record<string, unknown>;
  dedupeKey?: string;
};

/**
 * Create an activity event via backend-api (requires requireAuthContext()).
 * Fire-and-forget — never throws.
 */
export async function appendActivityEvent(
  params: ActivityEventParams
): Promise<string | null> {
  try {
    const res = await proxyToBackendApi("/api/org/activity-events", {
      method: "POST",
      body: {
        event_type: params.eventType,
        category: params.category,
        severity: params.severity,
        resource_type: params.resourceType ?? null,
        resource_id: params.resourceId ?? null,
        notification_policy: params.notificationPolicy,
        payload: params.payload ?? {},
        dedupe_key: params.dedupeKey ?? null,
      },
    });
    if (res.status >= 400) return null;
    const data = await res.json();
    return (data.activity_event_id as string) ?? null;
  } catch (error) {
    console.error("Failed to append activity event:", error);
    return null;
  }
}

type AdminActivityEventParams = ActivityEventParams & {
  orgId?: string | null;
  actorUserId?: string | null;
};

/**
 * Create an activity event via backend-api internal endpoint.
 * For routes without standard auth context (claim, decline, onboarding).
 * Fire-and-forget — never throws.
 */
export async function appendActivityEventAdmin(
  params: AdminActivityEventParams
): Promise<string | null> {
  try {
    const res = await fetch(`${BACKEND_API_URL}/api/internal/activity-events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Key": INTERNAL_API_KEY,
      },
      body: JSON.stringify({
        org_id: params.orgId ?? null,
        actor_user_id: params.actorUserId ?? null,
        event_type: params.eventType,
        category: params.category,
        severity: params.severity,
        resource_type: params.resourceType ?? null,
        resource_id: params.resourceId ?? null,
        notification_policy: params.notificationPolicy,
        payload: params.payload ?? {},
        dedupe_key: params.dedupeKey ?? null,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data.activity_event_id as string) ?? null;
  } catch (error) {
    console.error("Failed to append activity event (admin):", error);
    return null;
  }
}
