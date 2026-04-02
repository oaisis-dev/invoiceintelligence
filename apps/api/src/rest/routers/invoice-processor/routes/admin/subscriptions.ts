/**
 * Subscription plan and org billing routes — /api/admin/subscriptions
 * Translated from backend/api/src/routes/admin/subscriptions.py
 */

import { Hono } from "hono";
import type { InvoiceProcessorEnv } from "../../types";
import { adminAuth, checkPermission } from "../../middleware";
import { stripNulls } from "../../utils";

const app = new Hono<InvoiceProcessorEnv>();

app.get("/subscription-plans", adminAuth, async (c) => {
  checkPermission(c.get("adminAuth"), "manage_plans");
  return c.json(c.get("container").admin.subscription.listPlans());
});

app.post("/subscription-plans", adminAuth, async (c) => {
  checkPermission(c.get("adminAuth"), "manage_plans");
  const body = await c.req.json<Record<string, unknown>>();
  return c.json(c.get("container").admin.subscription.upsertPlan(stripNulls(body)));
});

app.get("/organizations/:orgId/subscription", adminAuth, async (c) => {
  checkPermission(c.get("adminAuth"), "manage_billing");
  return c.json(c.get("container").admin.subscription.getOrgSubscription(c.req.param("orgId")));
});

app.put("/organizations/:orgId/subscription", adminAuth, async (c) => {
  checkPermission(c.get("adminAuth"), "manage_billing");
  const body = await c.req.json<Record<string, unknown>>();
  c.get("container").admin.subscription.updateOrgSubscription(c.req.param("orgId"), stripNulls(body));
  return c.json({ success: true });
});

export { app as subscriptionsRouter };
