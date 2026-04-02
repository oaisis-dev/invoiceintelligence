import { createServerClient } from "@/lib/supabase/server";
import type {
  EmailIngestionWithAttachments,
  EmailIngestionFilters,
} from "@/types/database";

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 25;

/**
 * Fetch paginated email ingestion records with their attachments.
 * Each attachment may optionally be linked to an invoice (for status display).
 * RLS on email_ingestions is org-scoped; email_attachments scoped via FK join.
 */
export async function getEmailIngestions(
  filters: EmailIngestionFilters = {}
): Promise<{ data: EmailIngestionWithAttachments[]; count: number }> {
  const supabase = await createServerClient();

  const page = filters.page ?? DEFAULT_PAGE;
  const perPage = filters.perPage ?? DEFAULT_PER_PAGE;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .from("email_ingestions")
    .select(
      "*, email_attachments(*, invoice:invoices(id, status, vendor_name))",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.search) {
    query = query.or(
      `from_email.ilike.%${filters.search}%,subject.ilike.%${filters.search}%`
    );
  }

  if (filters.dateFrom) {
    query = query.gte("created_at", filters.dateFrom);
  }

  if (filters.dateTo) {
    query = query.lte("created_at", filters.dateTo);
  }

  const { data, count, error } = await query;

  if (error) {
    throw new Error(
      `Failed to fetch email ingestions: ${error.message}`
    );
  }

  return {
    data: (data ?? []) as unknown as EmailIngestionWithAttachments[],
    count: count ?? 0,
  };
}

/**
 * Fetch a single email ingestion by ID with all attachments and linked invoices.
 */
export async function getEmailIngestionById(
  id: string
): Promise<EmailIngestionWithAttachments | null> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("email_ingestions")
    .select(
      "*, email_attachments(*, invoice:invoices(id, status, vendor_name))"
    )
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(
      `Failed to fetch email ingestion: ${error.message}`
    );
  }

  return data as unknown as EmailIngestionWithAttachments;
}
