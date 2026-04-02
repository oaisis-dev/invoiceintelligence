import "server-only";

import { fetchFromBackendApi } from "@/lib/backend-api";
import type { PlatformAdmin, PlatformAdminPermission } from "@/types/database";

export async function getPlatformAdmins(): Promise<PlatformAdmin[]> {
  return fetchFromBackendApi<PlatformAdmin[]>("/api/admin/admins");
}

export async function createPlatformAdmin(admin: {
  email: string;
  display_name: string | null;
  permissions: PlatformAdminPermission[];
}): Promise<PlatformAdmin> {
  return fetchFromBackendApi<PlatformAdmin>("/api/admin/admins", {
    method: "POST",
    body: admin,
  });
}

export async function updatePlatformAdmin(
  id: string,
  updates: {
    display_name?: string | null;
    permissions?: PlatformAdminPermission[];
    is_active?: boolean;
  }
): Promise<PlatformAdmin> {
  return fetchFromBackendApi<PlatformAdmin>(`/api/admin/admins/${id}`, {
    method: "PUT",
    body: { id, ...updates },
  });
}

export async function deletePlatformAdmin(id: string): Promise<void> {
  await fetchFromBackendApi<{ success: boolean }>(`/api/admin/admins/${id}`, {
    method: "DELETE",
  });
}
