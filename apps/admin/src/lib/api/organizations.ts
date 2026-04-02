import "server-only";

import { fetchFromBackendApi } from "@/lib/backend-api";
import type { Organization, User, Location, Invoice, EmailAccount } from "@/types/database";

export type OrganizationListItem = Organization & {
  member_count: number;
  invoice_count: number;
};

export async function getOrganizations(params: {
  search?: string;
  page?: number;
  perPage?: number;
}): Promise<{ data: OrganizationListItem[]; total: number }> {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.set("search", params.search);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.perPage) searchParams.set("per_page", String(params.perPage));

  return fetchFromBackendApi<{ data: OrganizationListItem[]; total: number }>(
    "/api/admin/organizations",
    { searchParams }
  );
}

export async function getOrganizationById(id: string) {
  return fetchFromBackendApi<{
    organization: Organization;
    members: Pick<
      User,
      "id" | "email" | "display_name" | "role" | "is_active" | "created_at"
    >[];
    locations: Pick<
      Location,
      "id" | "name" | "address" | "is_active" | "is_default" | "created_at"
    >[];
    recentInvoices: Pick<
      Invoice,
      "id" | "status" | "vendor_name" | "total_amount" | "source" | "created_at"
    >[];
    emailAccounts: Pick<
      EmailAccount,
      "id" | "email_address" | "provider" | "is_active" | "created_at"
    >[];
  }>(`/api/admin/organizations/${id}`);
}
