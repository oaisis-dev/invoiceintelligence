import "server-only";

import { fetchFromBackendApi } from "@/lib/backend-api";
import type { PlatformAdminPermission } from "@/types/database";

export type PlatformAdminContext = {
  adminId: string;
  email: string;
  displayName: string | null;
  permissions: PlatformAdminPermission[];
};

/**
 * Verify the current user is a platform admin.
 * Returns the admin context or throws an error.
 */
export async function requirePlatformAdmin(): Promise<PlatformAdminContext> {
  return fetchFromBackendApi<PlatformAdminContext>("/api/admin/me");
}

/**
 * Check if the admin has a specific permission.
 * `manage_platform` acts as a superadmin permission.
 */
export function hasPermission(
  ctx: PlatformAdminContext,
  perm: PlatformAdminPermission
): boolean {
  return (
    ctx.permissions.includes(perm) ||
    ctx.permissions.includes("manage_platform")
  );
}
