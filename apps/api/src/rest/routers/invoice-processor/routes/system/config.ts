/**
 * System config routes — /api/system/* (platform admin only)
 * Translated from backend/api/src/routes/system/config.py
 *
 * CRUD for system_canonical_fields, system_term_mappings, system_categories,
 * system_category_rules, system_normalization_settings.
 */

import { Hono } from "hono";
import type { InvoiceProcessorEnv } from "../../types";
import { adminAuth } from "../../middleware";
import { toDict } from "../../serialization";
import { stripNulls } from "../../utils";

const app = new Hono<InvoiceProcessorEnv>();

// -- Fields -------------------------------------------------------------------

app.get("/fields", adminAuth, async (c) => {
  return c.json(c.get("container").systemConfigService.listFields().map(toDict));
});

app.post("/fields", adminAuth, async (c) => {
  const body = await c.req.json<Record<string, unknown>>();
  return c.json(toDict(c.get("container").systemConfigService.createField(stripNulls(body))));
});

app.put("/fields/:fieldId", adminAuth, async (c) => {
  const body = await c.req.json<Record<string, unknown>>();
  return c.json(toDict(c.get("container").systemConfigService.updateField(c.req.param("fieldId"), stripNulls(body))));
});

// -- Mappings -----------------------------------------------------------------

app.get("/mappings", adminAuth, async (c) => {
  return c.json(c.get("container").systemConfigService.listMappings().map(toDict));
});

app.post("/mappings", adminAuth, async (c) => {
  const body = await c.req.json<Record<string, unknown>>();
  return c.json(toDict(c.get("container").systemConfigService.createMapping(stripNulls(body))));
});

app.put("/mappings/:mappingId", adminAuth, async (c) => {
  const body = await c.req.json<Record<string, unknown>>();
  return c.json(toDict(c.get("container").systemConfigService.updateMapping(c.req.param("mappingId"), stripNulls(body))));
});

// -- Categories ---------------------------------------------------------------

app.get("/categories", adminAuth, async (c) => {
  return c.json(c.get("container").systemConfigService.listCategories().map(toDict));
});

app.post("/categories", adminAuth, async (c) => {
  const body = await c.req.json<Record<string, unknown>>();
  return c.json(toDict(c.get("container").systemConfigService.createCategory(stripNulls(body))));
});

app.put("/categories/:categoryId", adminAuth, async (c) => {
  const body = await c.req.json<Record<string, unknown>>();
  return c.json(toDict(c.get("container").systemConfigService.updateCategory(c.req.param("categoryId"), stripNulls(body))));
});

// -- Category Rules -----------------------------------------------------------

app.get("/rules", adminAuth, async (c) => {
  return c.json(c.get("container").systemConfigService.listRules().map(toDict));
});

app.post("/rules", adminAuth, async (c) => {
  const body = await c.req.json<Record<string, unknown>>();
  return c.json(toDict(c.get("container").systemConfigService.createRule(stripNulls(body))));
});

app.put("/rules/:ruleId", adminAuth, async (c) => {
  const body = await c.req.json<Record<string, unknown>>();
  return c.json(toDict(c.get("container").systemConfigService.updateRule(c.req.param("ruleId"), stripNulls(body))));
});

// -- Normalization Settings ---------------------------------------------------

app.get("/settings", adminAuth, async (c) => {
  return c.json(c.get("container").systemConfigService.listSettings().map(toDict));
});

app.post("/settings", adminAuth, async (c) => {
  const body = await c.req.json<Record<string, unknown>>();
  return c.json(toDict(c.get("container").systemConfigService.createSetting(stripNulls(body))));
});

app.put("/settings/:settingId", adminAuth, async (c) => {
  const body = await c.req.json<Record<string, unknown>>();
  return c.json(toDict(c.get("container").systemConfigService.updateSetting(c.req.param("settingId"), stripNulls(body))));
});

export { app as systemConfigRouter };
