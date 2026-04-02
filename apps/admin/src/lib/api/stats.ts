import "server-only";

import { fetchFromBackendApi } from "@/lib/backend-api";
import type { PlatformStats } from "@/types/database";

export async function getPlatformStats(): Promise<PlatformStats> {
  return fetchFromBackendApi<PlatformStats>("/api/admin/stats");
}
