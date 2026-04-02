/**
 * Dashboard statistics — /api/admin/stats
 * Translated from backend/api/src/routes/admin/stats.py
 */

import { Hono } from "hono";
import type { InvoiceProcessorEnv } from "../../types";
import { adminAuth } from "../../middleware";

const app = new Hono<InvoiceProcessorEnv>();

// GET /stats — get platform stats
app.get("/", adminAuth, async (c) => {
  const container = c.get("container");
  return c.json(container.admin.stats.getPlatformStats());
});

export { app as statsRouter };
