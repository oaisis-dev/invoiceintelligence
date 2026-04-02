/**
 * Org category and category rule routes — /api/org/categories, /api/org/category-rules
 * Translated from backend/api/src/routes/categories.py
 */

import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { InvoiceProcessorEnv } from "../types";
import { clerkAuth } from "../middleware";
import { toDict } from "../serialization";
import { stripNulls } from "../utils";

const app = new Hono<InvoiceProcessorEnv>();

// -- Categories ---------------------------------------------------------------

app.get("/categories", clerkAuth, async (c) => {
  const auth = c.get("auth");
  const container = c.get("container");
  return c.json(container.orgCategoryService.listActiveCategories(auth.orgId).map(toDict));
});

app.get("/categories/system", clerkAuth, async (c) => {
  return c.json(c.get("container").orgCategoryService.getSystemCategories().map(toDict));
});

app.post("/categories", clerkAuth, async (c) => {
  const auth = c.get("auth");
  const container = c.get("container");
  const body = await c.req.json<{
    code: string;
    display_name: string;
    description?: string | null;
    default_account?: number | null;
    default_sub_account?: number | null;
    sort_order?: number;
  }>();
  return c.json(toDict(container.orgCategoryService.createCategory(auth.orgId, body)));
});

app.post("/categories/ensure", clerkAuth, async (c) => {
  const auth = c.get("auth");
  const container = c.get("container");
  const body = await c.req.json<{ system_category_id: string }>();
  return c.json(toDict(container.orgCategoryService.ensureOrgCategory(auth.orgId, body.system_category_id)));
});

app.put("/categories/:categoryId", clerkAuth, async (c) => {
  const auth = c.get("auth");
  const container = c.get("container");
  const body = await c.req.json<Record<string, unknown>>();
  const data = stripNulls(body);
  if (Object.keys(data).length === 0) {
    throw new HTTPException(400, { message: "No fields to update" });
  }
  return c.json(toDict(container.orgCategoryService.updateCategory(auth.orgId, c.req.param("categoryId"), data)));
});

app.delete("/categories/:categoryId", clerkAuth, async (c) => {
  const auth = c.get("auth");
  const container = c.get("container");
  container.orgCategoryService.deleteCategory(auth.orgId, c.req.param("categoryId"));
  return c.json({ ok: true });
});

// -- Category Rules -----------------------------------------------------------

app.get("/category-rules", clerkAuth, async (c) => {
  const auth = c.get("auth");
  const container = c.get("container");
  return c.json(container.orgCategoryService.listActiveRules(auth.orgId).map(toDict));
});

app.post("/category-rules", clerkAuth, async (c) => {
  const auth = c.get("auth");
  const container = c.get("container");
  const body = await c.req.json<{
    category_id: string;
    match_mode?: string;
    match_source?: string;
    match_value?: string;
    vendor_name_pattern?: string | null;
    priority?: number;
    system_category_id?: string | null;
  }>();
  const { system_category_id, ...data } = body;
  return c.json(toDict(container.orgCategoryService.createRule(auth.orgId, data, system_category_id ?? undefined)));
});

app.put("/category-rules/:ruleId", clerkAuth, async (c) => {
  const auth = c.get("auth");
  const container = c.get("container");
  const body = await c.req.json<Record<string, unknown>>();
  const data = stripNulls(body);
  if (Object.keys(data).length === 0) {
    throw new HTTPException(400, { message: "No fields to update" });
  }
  return c.json(toDict(container.orgCategoryService.updateRule(auth.orgId, c.req.param("ruleId"), data)));
});

app.delete("/category-rules/:ruleId", clerkAuth, async (c) => {
  const auth = c.get("auth");
  const container = c.get("container");
  container.orgCategoryService.deleteRule(auth.orgId, c.req.param("ruleId"));
  return c.json({ ok: true });
});

export { app as categoriesRouter };
