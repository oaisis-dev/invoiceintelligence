/**
 * Contact requests — /api/admin/contact-requests
 * Translated from backend/api/src/routes/admin/contact_requests.py
 */

import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { InvoiceProcessorEnv } from "../../types";
import { adminAuth, checkPermission } from "../../middleware";

const VALID_STATUSES = ["pending", "contacted", "resolved"];

const app = new Hono<InvoiceProcessorEnv>();

// GET /contact-requests — list all contact requests
app.get("/", adminAuth, async (c) => {
  const ctx = c.get("adminAuth");
  checkPermission(ctx, "manage_platform");
  const container = c.get("container");
  return c.json({ requests: container.admin.contactRequest.listAll() });
});

// PUT /contact-requests/:requestId — update contact request status
app.put("/:requestId", adminAuth, async (c) => {
  const ctx = c.get("adminAuth");
  checkPermission(ctx, "manage_platform");
  const container = c.get("container");
  const requestId = c.req.param("requestId");
  const body = await c.req.json<{ status: string }>();

  if (!VALID_STATUSES.includes(body.status)) {
    throw new HTTPException(400, { message: `Invalid status: ${body.status}` });
  }

  container.admin.contactRequest.updateStatus(requestId, body.status, ctx.email);
  return c.json({ success: true });
});

export { app as contactRequestsRouter };
