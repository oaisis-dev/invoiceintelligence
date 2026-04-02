/**
 * User queries — /api/admin/users
 * Translated from backend/api/src/routes/admin/users.py
 */

import { Hono } from "hono";
import type { InvoiceProcessorEnv } from "../../types";
import { adminAuth, checkPermission } from "../../middleware";

const app = new Hono<InvoiceProcessorEnv>();

// GET /users — list users (paginated)
app.get("/", adminAuth, async (c) => {
  const ctx = c.get("adminAuth");
  checkPermission(ctx, "read_orgs");
  const container = c.get("container");
  const search = c.req.query("search") ?? null;
  const page = Number.parseInt(c.req.query("page") ?? "1", 10);
  const perPage = Number.parseInt(c.req.query("per_page") ?? "20", 10);
  return c.json(container.admin.user.listPaginated({ search, page, perPage }));
});

export { app as usersRouter };
