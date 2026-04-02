import "server-only";

import { fetchFromBackendApi } from "@/lib/backend-api";
import type { ContactRequest } from "@/types/database";

export async function getContactRequests(): Promise<ContactRequest[]> {
  const data = await fetchFromBackendApi<{ requests: ContactRequest[] }>(
    "/api/admin/contact-requests"
  );
  return data.requests;
}
