/**
 * Organization queries — /api/admin/organizations
 * Translated from backend/api/src/routes/admin/organizations.py
 */

import { Hono } from "hono";
import type { InvoiceProcessorEnv } from "../../types";
import { adminAuth, checkPermission } from "../../middleware";

const app = new Hono<InvoiceProcessorEnv>();

// GET /organizations — list organizations (paginated)
app.get("/", adminAuth, async (c) => {
  const ctx = c.get("adminAuth");
  checkPermission(ctx, "read_orgs");
  const container = c.get("container");
  const search = c.req.query("search") ?? null;
  const page = Number.parseInt(c.req.query("page") ?? "1", 10);
  const perPage = Number.parseInt(c.req.query("per_page") ?? "20", 10);
  return c.json(container.admin.organization.listPaginated({ search, page, perPage }));
});

// GET /organizations/:orgId — get organization detail
app.get("/:orgId", adminAuth, async (c) => {
  const ctx = c.get("adminAuth");
  checkPermission(ctx, "read_orgs");
  const container = c.get("container");
  const orgId = c.req.param("orgId");
  return c.json(container.admin.organization.getDetail(orgId));
});

export { app as organizationsRouter };
