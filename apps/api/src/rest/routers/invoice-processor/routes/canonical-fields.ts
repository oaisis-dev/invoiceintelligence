/**
 * Org canonical field routes — /api/org/fields
 * Translated from backend/api/src/routes/canonical_fields.py
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
  return c.json(container.orgFieldService.listAll(auth.orgId).map(toDict));
});

app.get("/system", clerkAuth, async (c) => {
  const container = c.get("container");
  return c.json(container.orgFieldService.getSystemFields().map(toDict));
});

app.post("/", clerkAuth, async (c) => {
  const auth = c.get("auth");
  const container = c.get("container");
  const body = await c.req.json<{
    section_type: string;
    field_key: string;
    display_name: string;
    value_type_id: string;
    type_metadata?: Record<string, unknown> | null;
    is_required?: boolean;
    show_in_review?: boolean;
    show_in_export?: boolean;
    sort_order?: number;
  }>();
  return c.json(toDict(container.orgFieldService.createCustom(auth.orgId, body)));
});

app.post("/ensure", clerkAuth, async (c) => {
  const auth = c.get("auth");
  const container = c.get("container");
  const body = await c.req.json<{ system_field_id: string }>();
  return c.json(toDict(container.orgFieldService.ensureOrgField(auth.orgId, body.system_field_id)));
});

app.put("/:fieldId", clerkAuth, async (c) => {
  const auth = c.get("auth");
  const container = c.get("container");
  const fieldId = c.req.param("fieldId");
  const body = await c.req.json<Record<string, unknown>>();
  const data = stripNulls(body);
  if (Object.keys(data).length === 0) {
    throw new HTTPException(400, { message: "No fields to update" });
  }
  return c.json(toDict(container.orgFieldService.update(auth.orgId, fieldId, data)));
});

app.delete("/:fieldId", clerkAuth, async (c) => {
  const auth = c.get("auth");
  const container = c.get("container");
  container.orgFieldService.delete(auth.orgId, c.req.param("fieldId"));
  return c.json({ ok: true });
});

export { app as canonicalFieldsRouter };
