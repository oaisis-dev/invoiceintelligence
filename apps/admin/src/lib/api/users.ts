import "server-only";

import { fetchFromBackendApi } from "@/lib/backend-api";

export type UserListItem = {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  org_id: string;
  org_name: string;
  org_slug: string;
};

export async function getUsers(params: {
  search?: string;
  page?: number;
  perPage?: number;
}): Promise<{ data: UserListItem[]; total: number }> {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.set("search", params.search);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.perPage) searchParams.set("per_page", String(params.perPage));

  return fetchFromBackendApi<{ data: UserListItem[]; total: number }>(
    "/api/admin/users",
    { searchParams }
  );
}
