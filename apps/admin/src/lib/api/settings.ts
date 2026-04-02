import "server-only";

import { fetchFromBackendApi } from "@/lib/backend-api";
import type { PlatformSetting } from "@/types/database";

export async function getPlatformSettings(): Promise<PlatformSetting[]> {
  return fetchFromBackendApi<PlatformSetting[]>("/api/admin/settings");
}
