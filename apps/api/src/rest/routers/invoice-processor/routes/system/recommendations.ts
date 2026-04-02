/**
 * System recommendation routes — /api/system/recommendations (platform admin only)
 * Translated from backend/api/src/routes/system/recommendations.py
 */

import { Hono } from "hono";
import type { InvoiceProcessorEnv } from "../../types";
import { adminAuth } from "../../middleware";
import { toDict } from "../../serialization";

const app = new Hono<InvoiceProcessorEnv>();

// -- Term recommendations -----------------------------------------------------

// GET /terms — list pending system term recommendations
app.get("/terms", adminAuth, async (c) => {
  const container = c.get("container");
  return c.json(container.systemRecommendationService.listPendingTerms().map(toDict));
});

// POST /terms/:recId/promote — promote a term recommendation
app.post("/terms/:recId/promote", adminAuth, async (c) => {
  const adminCtx = c.get("adminAuth");
  const container = c.get("container");
  const recId = c.req.param("recId");
  const body = await c.req.json<{ promoted_to_id?: string | null }>();
  const result = container.systemRecommendationService.promoteTerm(
    recId,
    body.promoted_to_id ?? null,
    adminCtx.adminId,
  );
  return c.json(toDict(result));
});

// POST /terms/:recId/dismiss — dismiss a term recommendation
app.post("/terms/:recId/dismiss", adminAuth, async (c) => {
  const adminCtx = c.get("adminAuth");
  const container = c.get("container");
  const recId = c.req.param("recId");
  const result = container.systemRecommendationService.dismissTerm(recId, adminCtx.adminId);
  return c.json(toDict(result));
});

// -- Category recommendations -------------------------------------------------

// GET /categories — list pending system category recommendations
app.get("/categories", adminAuth, async (c) => {
  const container = c.get("container");
  return c.json(container.systemRecommendationService.listPendingCategories().map(toDict));
});

// POST /categories/:recId/promote — promote a category recommendation
app.post("/categories/:recId/promote", adminAuth, async (c) => {
  const adminCtx = c.get("adminAuth");
  const container = c.get("container");
  const recId = c.req.param("recId");
  const body = await c.req.json<{ promoted_to_id?: string | null }>();
  const result = container.systemRecommendationService.promoteCategory(
    recId,
    body.promoted_to_id ?? null,
    adminCtx.adminId,
  );
  return c.json(toDict(result));
});

// POST /categories/:recId/dismiss — dismiss a category recommendation
app.post("/categories/:recId/dismiss", adminAuth, async (c) => {
  const adminCtx = c.get("adminAuth");
  const container = c.get("container");
  const recId = c.req.param("recId");
  const result = container.systemRecommendationService.dismissCategory(recId, adminCtx.adminId);
  return c.json(toDict(result));
});

export { app as systemRecommendationsRouter };
