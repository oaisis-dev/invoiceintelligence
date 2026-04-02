/**
 * GET /api/admin/me — return current admin context with permissions
 * Translated from backend/api/src/routes/admin/me.py
 */

import { Hono } from "hono";
import type { InvoiceProcessorEnv } from "../../types";
import { adminAuth } from "../../middleware";

const app = new Hono<InvoiceProcessorEnv>();

// GET /me — return current admin info
app.get("/", adminAuth, async (c) => {
  const ctx = c.get("adminAuth");
  return c.json({
    adminId: ctx.adminId,
    email: ctx.email,
    displayName: ctx.displayName,
    permissions: ctx.permissions,
  });
});

export { app as meRouter };
