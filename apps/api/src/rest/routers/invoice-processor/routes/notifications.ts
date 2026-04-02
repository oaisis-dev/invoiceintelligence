/**
 * Org notification routes — /api/org/notifications + /api/org/activity-events
 * Translated from backend/api/src/routes/notifications.py (~280 lines)
 *
 * Handles user notifications, activity events, admin notifications, and preferences.
 */

import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { InvoiceProcessorEnv, ActivityEventInput } from "../types";
import { clerkAuth, requireInternalKey } from "../middleware";

const app = new Hono<InvoiceProcessorEnv>();

// -- Activity Events ----------------------------------------------------------

// POST /api/org/activity-events — create an activity event (org-authed)
app.post("/activity-events", clerkAuth, async (c) => {
  const auth = c.get("auth");
  const container = c.get("container");
  const body = await c.req.json<{
    event_type: string;
    category: string;
    severity: string;
    resource_type?: string | null;
    resource_id?: string | null;
    notification_policy: string;
    payload?: Record<string, unknown> | null;
    dedupe_key?: string | null;
  }>();

  const event: ActivityEventInput = {
    orgId: auth.orgId,
    actorUserId: auth.userId,
    eventType: body.event_type,
    category: body.category,
    severity: body.severity,
    notificationPolicy: body.notification_policy,
    resourceType: body.resource_type ?? null,
    resourceId: body.resource_id ?? null,
    payload: body.payload ?? {},
    dedupeKey: body.dedupe_key ?? null,
  };

  const eventId = container.notificationService.appendActivityEvent(event);
  return c.json({ activity_event_id: eventId });
});

// -- Notifications ------------------------------------------------------------

// GET /api/org/notifications — list user notifications
app.get("/notifications", clerkAuth, async (c) => {
  const auth = c.get("auth");
  const container = c.get("container");
  const category = c.req.query("category") ?? null;
  const unreadOnly = c.req.query("unread_only") === "true";
  const cursor = c.req.query("cursor") ?? null;
  const limit = Number.parseInt(c.req.query("limit") ?? "20", 10);

  const data = container.notificationService.listNotifications(
    auth.userId,
    { category, unreadOnly, cursor, limit },
  );
  return c.json({ data });
});

// GET /api/org/notifications/unread-count
app.get("/notifications/unread-count", clerkAuth, async (c) => {
  const auth = c.get("auth");
  const container = c.get("container");
  const count = container.notificationService.unreadCount(auth.userId);
  return c.json({ count });
});

// POST /api/org/notifications/mark-read
app.post("/notifications/mark-read", clerkAuth, async (c) => {
  const auth = c.get("auth");
  const container = c.get("container");
  const body = await c.req.json<{ notification_ids: string[] }>();
  container.notificationService.markRead(auth.userId, body.notification_ids);
  return c.json({ ok: true });
});

// POST /api/org/notifications/mark-all-read
app.post("/notifications/mark-all-read", clerkAuth, async (c) => {
  const auth = c.get("auth");
  const container = c.get("container");
  container.notificationService.markAllRead(auth.userId);
  return c.json({ ok: true });
});

// POST /api/org/notifications/dismiss
app.post("/notifications/dismiss", clerkAuth, async (c) => {
  const auth = c.get("auth");
  const container = c.get("container");
  const body = await c.req.json<{ notification_ids: string[] }>();
  container.notificationService.dismiss(auth.userId, body.notification_ids);
  return c.json({ ok: true });
});

// -- Preferences --------------------------------------------------------------

// GET /api/org/notifications/preferences
app.get("/notifications/preferences", clerkAuth, async (c) => {
  const auth = c.get("auth");
  const container = c.get("container");
  const data = container.notificationService.getPreferences(auth.userId, auth.orgId);
  return c.json({ data });
});

// PUT /api/org/notifications/preferences
app.put("/notifications/preferences", clerkAuth, async (c) => {
  const auth = c.get("auth");
  const container = c.get("container");
  const body = await c.req.json<{
    category: string;
    in_app_enabled?: boolean | null;
    email_enabled?: boolean | null;
    minimum_severity?: string | null;
  }>();
  const result = container.notificationService.upsertPreference(
    auth.userId,
    auth.orgId,
    body.category,
    {
      inAppEnabled: body.in_app_enabled ?? undefined,
      emailEnabled: body.email_enabled ?? undefined,
      minimumSeverity: body.minimum_severity ?? undefined,
    },
  );
  return c.json(result);
});

// -- Internal Activity Events (service-to-service) ----------------------------

// POST /api/internal/activity-events — create event without org auth
app.post("/internal/activity-events", requireInternalKey, async (c) => {
  const container = c.get("container");
  const body = await c.req.json<{
    org_id?: string | null;
    actor_user_id?: string | null;
    event_type: string;
    category: string;
    severity: string;
    resource_type?: string | null;
    resource_id?: string | null;
    notification_policy: string;
    payload?: Record<string, unknown> | null;
    dedupe_key?: string | null;
  }>();

  const event: ActivityEventInput = {
    orgId: body.org_id ?? null,
    actorUserId: body.actor_user_id ?? null,
    eventType: body.event_type,
    category: body.category,
    severity: body.severity,
    notificationPolicy: body.notification_policy,
    resourceType: body.resource_type ?? null,
    resourceId: body.resource_id ?? null,
    payload: body.payload ?? {},
    dedupeKey: body.dedupe_key ?? null,
  };

  const eventId = container.notificationService.appendActivityEvent(event);
  return c.json({ activity_event_id: eventId });
});

// -- Resource Activity History ------------------------------------------------

// GET /api/org/activity-events/by-resource — list events for a resource
app.get("/activity-events/by-resource", clerkAuth, async (c) => {
  const auth = c.get("auth");
  const container = c.get("container");
  const resourceType = c.req.query("resource_type");
  const resourceId = c.req.query("resource_id");
  const limitStr = c.req.query("limit") ?? "50";
  const limit = Math.min(Math.max(Number.parseInt(limitStr, 10) || 50, 1), 500);

  if (!resourceType || !resourceId) {
    throw new HTTPException(400, { message: "resource_type and resource_id are required" });
  }

  const events: Record<string, unknown>[] = container.notificationService.listEventsForResource(
    auth.orgId,
    resourceType,
    resourceId,
    limit,
  );

  // Resolve actor info from users table
  const actorIds = [
    ...new Set(
      events
        .map((e) => e.actor_user_id as string | undefined)
        .filter((id): id is string => !!id),
    ),
  ];

  let actorMap: Record<string, Record<string, unknown>> = {};
  if (actorIds.length > 0) {
    try {
      const db = container.db;
      const response = db.client
        .table("users")
        .select("id, email, display_name")
        .in_("id", actorIds)
        .execute();
      for (const user of response.data ?? []) {
        const id = user.id as string;
        actorMap[id] = {
          id,
          email: user.email ?? null,
          display_name: user.display_name ?? null,
        };
      }
    } catch {
      console.warn("Failed to resolve actor info for activity events");
    }
  }

  const history = events.map((e) => {
    const actorId = e.actor_user_id as string | undefined;
    return {
      id: e.id,
      action: e.event_type,
      resource_type: e.resource_type ?? resourceType,
      resource_id: e.resource_id ?? null,
      changes: e.payload ?? null,
      created_at: e.created_at,
      actor: actorId ? actorMap[actorId] ?? null : null,
    };
  });

  return c.json({ history });
});

export { app as notificationsRouter };
