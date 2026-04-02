/**
 * Org recommendation routes — /api/org/recommendations
 * Translated from backend/api/src/routes/recommendations.py
 */

import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { InvoiceProcessorEnv } from "../types";
import { clerkAuth } from "../middleware";
import { toDict } from "../serialization";

const app = new Hono<InvoiceProcessorEnv>();

// -- Term recommendations -----------------------------------------------------

// GET /terms — list pending term recommendations
app.get("/terms", clerkAuth, async (c) => {
  const auth = c.get("auth");
  const container = c.get("container");
  const recs = container.orgRecommendationService.listPendingTerms(auth.orgId);
  return c.json(recs.map(toDict));
});

// GET /terms/:recId — get a single term recommendation
app.get("/terms/:recId", clerkAuth, async (c) => {
  const auth = c.get("auth");
  const container = c.get("container");
  const recId = c.req.param("recId");
  const rec = container.orgRecommendationService.getTerm(auth.orgId, recId);
  if (!rec) {
    throw new HTTPException(404, { message: "Recommendation not found" });
  }
  return c.json(toDict(rec));
});

// POST /terms/:recId/resolve — resolve a term recommendation
app.post("/terms/:recId/resolve", clerkAuth, async (c) => {
  const auth = c.get("auth");
  const container = c.get("container");
  const recId = c.req.param("recId");
  const body = await c.req.json<{
    mapping_id: string;
    raw_label?: string;
    section_type?: string;
    suggested_field_key?: string;
    vendor_name_pattern?: string | null;
  }>();

  if (!container.orgRecommendationService.getTerm(auth.orgId, recId)) {
    throw new HTTPException(404, { message: "Recommendation not found" });
  }
  const result = container.orgRecommendationService.resolveTerm(auth.orgId, recId, body.mapping_id);

  // Bubble up to system-level recommendation
  if (body.raw_label && body.suggested_field_key) {
    container.systemRecommendationService.onOrgTermMappingCreated({
      rawLabel: body.raw_label,
      sectionType: body.section_type ?? "line_item",
      suggestedFieldKey: body.suggested_field_key,
      vendorNamePattern: body.vendor_name_pattern ?? null,
    });
  }

  return c.json(toDict(result));
});

// POST /terms/:recId/dismiss — dismiss a term recommendation
app.post("/terms/:recId/dismiss", clerkAuth, async (c) => {
  const auth = c.get("auth");
  const container = c.get("container");
  const recId = c.req.param("recId");
  const result = container.orgRecommendationService.dismissTerm(auth.orgId, recId);
  return c.json(toDict(result));
});

// -- Category recommendations -------------------------------------------------

// GET /categories — list pending category recommendations
app.get("/categories", clerkAuth, async (c) => {
  const auth = c.get("auth");
  const container = c.get("container");
  const recs = container.orgRecommendationService.listPendingCategories(auth.orgId);
  return c.json(recs.map(toDict));
});

// GET /categories/:recId — get a single category recommendation
app.get("/categories/:recId", clerkAuth, async (c) => {
  const auth = c.get("auth");
  const container = c.get("container");
  const recId = c.req.param("recId");
  const rec = container.orgRecommendationService.getCategory(auth.orgId, recId);
  if (!rec) {
    throw new HTTPException(404, { message: "Recommendation not found" });
  }
  return c.json(toDict(rec));
});

// POST /categories/:recId/resolve — resolve a category recommendation
app.post("/categories/:recId/resolve", clerkAuth, async (c) => {
  const auth = c.get("auth");
  const container = c.get("container");
  const recId = c.req.param("recId");
  const body = await c.req.json<{
    rule_id: string;
    raw_description?: string;
    suggested_category_code?: string;
    vendor_name_pattern?: string | null;
  }>();

  if (!container.orgRecommendationService.getCategory(auth.orgId, recId)) {
    throw new HTTPException(404, { message: "Recommendation not found" });
  }
  const result = container.orgRecommendationService.resolveCategory(auth.orgId, recId, body.rule_id);

  // Bubble up to system-level recommendation
  if (body.raw_description && body.suggested_category_code) {
    container.systemRecommendationService.onOrgCategoryRuleCreated({
      rawDescription: body.raw_description,
      suggestedCategoryCode: body.suggested_category_code,
      vendorNamePattern: body.vendor_name_pattern ?? null,
    });
  }

  return c.json(toDict(result));
});

// POST /categories/:recId/dismiss — dismiss a category recommendation
app.post("/categories/:recId/dismiss", clerkAuth, async (c) => {
  const auth = c.get("auth");
  const container = c.get("container");
  const recId = c.req.param("recId");
  const result = container.orgRecommendationService.dismissCategory(auth.orgId, recId);
  return c.json(toDict(result));
});

export { app as recommendationsRouter };
