/**
 * Admin notification routes — /api/admin/notifications
 * Translated from backend/api/src/routes/admin/notifications.py
 */

import { Hono } from "hono";
import type { InvoiceProcessorEnv } from "../../types";
import { adminAuth } from "../../middleware";

const app = new Hono<InvoiceProcessorEnv>();

// GET /notifications — list admin notifications
app.get("/", adminAuth, async (c) => {
  const ctx = c.get("adminAuth");
  const container = c.get("container");
  const category = c.req.query("category") ?? null;
  const unreadOnly = c.req.query("unread_only") === "true";
  const cursor = c.req.query("cursor") ?? null;
  const limit = Number.parseInt(c.req.query("limit") ?? "20", 10);

  const data = container.notificationService.listAdminNotifications(
    ctx.adminId,
    { category, unreadOnly, cursor, limit },
  );
  return c.json({ data });
});

// GET /notifications/unread-count
app.get("/unread-count", adminAuth, async (c) => {
  const ctx = c.get("adminAuth");
  const container = c.get("container");
  const count = container.notificationService.adminUnreadCount(ctx.adminId);
  return c.json({ count });
});

// POST /notifications/mark-read
app.post("/mark-read", adminAuth, async (c) => {
  const ctx = c.get("adminAuth");
  const container = c.get("container");
  const body = await c.req.json<{ notification_ids: string[] }>();
  container.notificationService.adminMarkRead(ctx.adminId, body.notification_ids);
  return c.json({ ok: true });
});

// POST /notifications/mark-all-read
app.post("/mark-all-read", adminAuth, async (c) => {
  const ctx = c.get("adminAuth");
  const container = c.get("container");
  container.notificationService.adminMarkAllRead(ctx.adminId);
  return c.json({ ok: true });
});

// POST /notifications/dismiss
app.post("/dismiss", adminAuth, async (c) => {
  const ctx = c.get("adminAuth");
  const container = c.get("container");
  const body = await c.req.json<{ notification_ids: string[] }>();
  container.notificationService.adminDismiss(ctx.adminId, body.notification_ids);
  return c.json({ ok: true });
});

export { app as adminNotificationsRouter };
