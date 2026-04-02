/**
 * Platform settings — /api/admin/settings
 * Translated from backend/api/src/routes/admin/settings.py
 */

import { Hono } from "hono";
import type { InvoiceProcessorEnv } from "../../types";
import { adminAuth, checkPermission } from "../../middleware";

const app = new Hono<InvoiceProcessorEnv>();

// GET /settings — list all platform settings
app.get("/", adminAuth, async (c) => {
  const ctx = c.get("adminAuth");
  checkPermission(ctx, "manage_platform");
  const container = c.get("container");
  return c.json(container.admin.platformSettings.listAll());
});

// PUT /settings/:key — update a platform setting
app.put("/:key", adminAuth, async (c) => {
  const ctx = c.get("adminAuth");
  checkPermission(ctx, "manage_platform");
  const container = c.get("container");
  const key = c.req.param("key");
  const body = await c.req.json<{ value: unknown }>();
  container.admin.platformSettings.upsert(key, body.value, ctx.adminId);
  return c.json({ success: true });
});

export { app as settingsRouter };
