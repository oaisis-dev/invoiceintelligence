/**
 * Format options routes — /api/format-options (read-only, shared reference data)
 * Translated from backend/api/src/routes/format_options.py
 */

import { Hono } from "hono";
import type { InvoiceProcessorEnv } from "../types";
import { clerkAuth } from "../middleware";
import { toDict } from "../serialization";

const app = new Hono<InvoiceProcessorEnv>();

// GET /api/format-options — list all
app.get("/", clerkAuth, async (c) => {
  const container = c.get("container");
  const options = container.formatOptionsService.listAll();
  return c.json(options.map(toDict));
});

// GET /api/format-options/grouped — list grouped by setting key
app.get("/grouped", clerkAuth, async (c) => {
  const container = c.get("container");
  const grouped: Record<string, Record<string, unknown>[]> = container.formatOptionsService.getGrouped();
  const result: Record<string, Record<string, unknown>[]> = {};
  for (const [key, opts] of Object.entries(grouped)) {
    result[key] = opts.map(toDict);
  }
  return c.json(result);
});

// GET /api/format-options/:settingKey — list by setting key
app.get("/:settingKey", clerkAuth, async (c) => {
  const container = c.get("container");
  const settingKey = c.req.param("settingKey");
  const options = container.formatOptionsService.listByKey(settingKey);
  return c.json(options.map(toDict));
});

export { app as formatOptionsRouter };
