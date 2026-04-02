/**
 * Auth middleware stubs for InvoiceProcessor routes.
 *
 * These will be replaced with real implementations from
 * @invoiceprocessor/shared/auth once that package is wired.
 */

import type { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import type { InvoiceProcessorEnv } from "./types";

/**
 * Org auth middleware — verifies Clerk session and resolves OrgAuthContext.
 * Sets `c.var.auth` with `{ orgId, userId }`.
 */
export const clerkAuth: MiddlewareHandler<InvoiceProcessorEnv> = async (_c, _next) => {
  // Stub — real implementation authenticates via Clerk JWT and resolves org membership.
  throw new HTTPException(501, { message: "clerkAuth middleware not yet wired" });
};

/**
 * Admin auth middleware — verifies admin session via email lookup in platform_admins.
 * Sets `c.var.adminAuth` with `{ adminId, email, displayName, permissions }`.
 */
export const adminAuth: MiddlewareHandler<InvoiceProcessorEnv> = async (_c, _next) => {
  // Stub — real implementation checks admin credentials.
  throw new HTTPException(501, { message: "adminAuth middleware not yet wired" });
};

/**
 * Permission check helper for admin routes.
 * Throws 403 if the admin lacks the required permission.
 */
export function checkPermission(
  ctx: { permissions: string[] },
  permission: string,
): void {
  if (!ctx.permissions.includes(permission)) {
    throw new HTTPException(403, {
      message: `Missing permission: ${permission}`,
    });
  }
}

/**
 * Internal API key middleware — verifies X-Internal-Key header for service-to-service calls.
 */
export const requireInternalKey: MiddlewareHandler<InvoiceProcessorEnv> = async (c, next) => {
  const expected = process.env.INTERNAL_API_KEY ?? "";
  if (!expected) {
    throw new HTTPException(500, { message: "INTERNAL_API_KEY not configured" });
  }
  const provided = c.req.header("X-Internal-Key") ?? "";
  if (provided !== expected) {
    throw new HTTPException(401, { message: "Invalid internal key" });
  }
  await next();
};
