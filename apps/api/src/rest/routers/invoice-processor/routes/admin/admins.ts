/**
 * CRUD for platform admins — /api/admin/admins
 * Translated from backend/api/src/routes/admin/admins.py
 */

import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { InvoiceProcessorEnv } from "../../types";
import { adminAuth, checkPermission } from "../../middleware";

const VALID_PERMISSIONS = [
  "read_orgs",
  "manage_billing",
  "impersonate",
  "manage_plans",
  "view_audit_logs",
  "manage_platform",
];

function validatePermissions(perms: string[]): void {
  const invalid = perms.filter((p) => !VALID_PERMISSIONS.includes(p));
  if (invalid.length > 0) {
    throw new HTTPException(400, { message: `Invalid permissions: ${JSON.stringify(invalid)}` });
  }
}

const app = new Hono<InvoiceProcessorEnv>();

// GET /admins — list all admins
app.get("/", adminAuth, async (c) => {
  const ctx = c.get("adminAuth");
  checkPermission(ctx, "manage_platform");
  const container = c.get("container");
  return c.json(container.admin.platformAdmin.listAll());
});

// POST /admins — create an admin
app.post("/", adminAuth, async (c) => {
  const ctx = c.get("adminAuth");
  checkPermission(ctx, "manage_platform");
  const container = c.get("container");
  const body = await c.req.json<{
    email: string;
    display_name?: string | null;
    permissions: string[];
  }>();
  validatePermissions(body.permissions);
  const result = container.admin.platformAdmin.create({
    email: body.email.trim().toLowerCase(),
    display_name: body.display_name?.trim() || null,
    permissions: body.permissions,
  });
  return c.json(result, 201);
});

// PUT /admins/:adminId — update an admin
app.put("/:adminId", adminAuth, async (c) => {
  const ctx = c.get("adminAuth");
  checkPermission(ctx, "manage_platform");
  const container = c.get("container");
  const adminId = c.req.param("adminId");
  const body = await c.req.json<{
    id: string;
    display_name?: string | null;
    permissions?: string[] | null;
    is_active?: boolean | null;
  }>();

  // Self-protection
  if (adminId === ctx.adminId && body.is_active === false) {
    throw new HTTPException(400, { message: "Cannot deactivate your own account" });
  }
  if (
    adminId === ctx.adminId &&
    body.permissions != null &&
    !body.permissions.includes("manage_platform")
  ) {
    throw new HTTPException(400, {
      message: "Cannot remove manage_platform from your own account",
    });
  }

  const updates: Record<string, unknown> = {};
  if (body.display_name !== undefined) {
    updates.display_name = body.display_name?.trim() || null;
  }
  if (body.permissions != null) {
    validatePermissions(body.permissions);
    updates.permissions = body.permissions;
  }
  if (body.is_active != null) {
    updates.is_active = body.is_active;
  }

  return c.json(container.admin.platformAdmin.update(adminId, updates));
});

// DELETE /admins/:adminId — delete an admin
app.delete("/:adminId", adminAuth, async (c) => {
  const ctx = c.get("adminAuth");
  checkPermission(ctx, "manage_platform");
  const container = c.get("container");
  const adminId = c.req.param("adminId");

  if (adminId === ctx.adminId) {
    throw new HTTPException(400, { message: "Cannot delete your own account" });
  }

  container.admin.platformAdmin.delete(adminId);
  return c.json({ success: true });
});

export { app as adminsRouter };
