/**
 * Org normalization settings routes — /api/org/normalization-settings
 * Translated from backend/api/src/routes/normalization_settings.py
 */

import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { InvoiceProcessorEnv } from "../types";
import { clerkAuth } from "../middleware";
import { toDict } from "../serialization";
import { stripNulls } from "../utils";

const app = new Hono<InvoiceProcessorEnv>();

app.get("/", clerkAuth, async (c) => {
  const auth = c.get("auth");
  const container = c.get("container");
  const vendorNamePattern = c.req.query("vendor_name_pattern");
  const settings = vendorNamePattern
    ? container.orgSettingsService.listVendorOverrides(auth.orgId, vendorNamePattern)
    : container.orgSettingsService.listAll(auth.orgId);
  return c.json(settings.map(toDict));
});

app.get("/defaults", clerkAuth, async (c) => {
  const auth = c.get("auth");
  const container = c.get("container");
  return c.json(container.orgSettingsService.listOrgDefaults(auth.orgId).map(toDict));
});

app.post("/", clerkAuth, async (c) => {
  const auth = c.get("auth");
  const container = c.get("container");
  const body = await c.req.json<Record<string, unknown>>();
  return c.json(toDict(container.orgSettingsService.create(auth.orgId, stripNulls(body))));
});

app.put("/:settingId", clerkAuth, async (c) => {
  const auth = c.get("auth");
  const container = c.get("container");
  const body = await c.req.json<Record<string, unknown>>();
  const data = stripNulls(body);
  if (Object.keys(data).length === 0) {
    throw new HTTPException(400, { message: "No fields to update" });
  }
  return c.json(toDict(container.orgSettingsService.update(auth.orgId, c.req.param("settingId"), data)));
});

app.delete("/:settingId", clerkAuth, async (c) => {
  const auth = c.get("auth");
  const container = c.get("container");
  container.orgSettingsService.delete(auth.orgId, c.req.param("settingId"));
  return c.json({ ok: true });
});

export { app as normalizationSettingsRouter };
