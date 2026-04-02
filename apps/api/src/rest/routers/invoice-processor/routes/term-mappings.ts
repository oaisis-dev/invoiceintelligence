/**
 * Org term mapping routes — /api/org/mappings
 * Translated from backend/api/src/routes/term_mappings.py
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
  return c.json(container.orgMappingService.listAll(auth.orgId).map(toDict));
});

app.get("/:mappingId", clerkAuth, async (c) => {
  const auth = c.get("auth");
  const container = c.get("container");
  const mapping = container.orgMappingService.get(auth.orgId, c.req.param("mappingId"));
  if (!mapping) {
    throw new HTTPException(404, { message: "Mapping not found" });
  }
  return c.json(toDict(mapping));
});

app.post("/", clerkAuth, async (c) => {
  const auth = c.get("auth");
  const container = c.get("container");
  const body = await c.req.json<{
    canonical_field_id: string;
    section_type: string;
    match_mode?: string;
    match_value?: string;
    vendor_name_pattern?: string | null;
    priority?: number;
    is_active?: boolean;
    is_ignored?: boolean;
    cast_options?: Record<string, unknown> | null;
    system_field_id?: string | null;
  }>();
  const { system_field_id, ...data } = body;
  return c.json(toDict(container.orgMappingService.create(auth.orgId, data, system_field_id ?? undefined)));
});

app.put("/:mappingId", clerkAuth, async (c) => {
  const auth = c.get("auth");
  const container = c.get("container");
  const body = await c.req.json<Record<string, unknown>>();
  const data = stripNulls(body);
  if (Object.keys(data).length === 0) {
    throw new HTTPException(400, { message: "No fields to update" });
  }
  return c.json(toDict(container.orgMappingService.update(auth.orgId, c.req.param("mappingId"), data)));
});

app.delete("/:mappingId", clerkAuth, async (c) => {
  const auth = c.get("auth");
  const container = c.get("container");
  container.orgMappingService.delete(auth.orgId, c.req.param("mappingId"));
  return c.json({ ok: true });
});

export { app as termMappingsRouter };
