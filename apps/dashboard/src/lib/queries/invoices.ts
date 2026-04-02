import { createServerClient } from "@/lib/supabase/server";
import type { DashboardStats as CanonicalDashboardStats } from "@/types/contracts";
import type {
  Invoice,
  InvoiceWithLineItems,
  InvoiceLineItem,
  InvoiceFilters,
  DashboardStats as UiDashboardStats,
  DuplicateGroupMember,
  InvoiceSource,
} from "@/types/database";

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 25;

type InvoiceCountQuery = {
  eq: (column: string, value: string) => InvoiceCountQuery;
  gte: (column: string, value: string) => InvoiceCountQuery;
};

type DashboardAggregateRow = CanonicalDashboardStats & {
  suspected_duplicates: number;
  email_invoices: number;
};

const DASHBOARD_STATS_RPC = "get_dashboard_stats_aggregate";
const DASHBOARD_RPC_NOT_FOUND_CODE = "PGRST202";

/**
 * Count invoices using index-friendly head/count queries.
 * Org scoping is handled by Supabase RLS policies.
 */
async function countInvoices(
  applyFilters?: (query: InvoiceCountQuery) => InvoiceCountQuery
): Promise<number> {
  const supabase = await createServerClient();
  const baseQuery = supabase
    .from("invoices")
    .select("id", { head: true, count: "exact" });
  const query = applyFilters
    ? applyFilters(baseQuery as unknown as InvoiceCountQuery)
    : (baseQuery as unknown as InvoiceCountQuery);

  const { count, error } = await (query as unknown as typeof baseQuery);
  if (error) {
    throw new Error(`Failed to count invoices: ${error.message}`);
  }

  return count ?? 0;
}

function normalizeDashboardAggregate(
  row: Partial<DashboardAggregateRow> | null
): DashboardAggregateRow {
  return {
    total_invoices: Number(row?.total_invoices ?? 0),
    processed_today: Number(row?.processed_today ?? 0),
    pending_review: Number(row?.pending_review ?? 0),
    approved: Number(row?.approved ?? 0),
    failed: Number(row?.failed ?? 0),
    processing: Number(row?.processing ?? 0),
    queued: Number(row?.queued ?? 0),
    uploaded: Number(row?.uploaded ?? 0),
    cancelled: Number(row?.cancelled ?? 0),
    exported: Number(row?.exported ?? 0),
    total_amount:
      row?.total_amount == null ? null : Number(row.total_amount),
    avg_processing_time_minutes:
      row?.avg_processing_time_minutes == null
        ? null
        : Number(row.avg_processing_time_minutes),
    suspected_duplicates: Number(row?.suspected_duplicates ?? 0),
    email_invoices: Number(row?.email_invoices ?? 0),
  };
}

function isMissingDashboardRpc(error: {
  code?: string;
  message: string;
}): boolean {
  return (
    error.code === DASHBOARD_RPC_NOT_FOUND_CODE ||
    /get_dashboard_stats_aggregate/i.test(error.message)
  );
}

/**
 * Legacy fallback for environments where the dashboard RPC migration
 * has not been applied yet.
 */
async function getDashboardAggregateLegacy(): Promise<DashboardAggregateRow> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartISO = todayStart.toISOString();

  const [
    totalInvoices,
    pendingReview,
    approved,
    failed,
    processing,
    queued,
    uploaded,
    cancelled,
    exported,
    processedToday,
    suspectedDuplicates,
    emailInvoices,
  ] = await Promise.all([
    countInvoices(),
    countInvoices((query) => query.eq("status", "ready_for_review")),
    countInvoices((query) => query.eq("status", "approved")),
    countInvoices((query) => query.eq("status", "failed")),
    countInvoices((query) => query.eq("status", "processing")),
    countInvoices((query) => query.eq("status", "queued")),
    countInvoices((query) => query.eq("status", "uploaded")),
    countInvoices((query) => query.eq("status", "cancelled")),
    countInvoices((query) => query.eq("status", "exported")),
    countInvoices((query) => query.gte("uploaded_at", todayStartISO)),
    countInvoices((query) => query.eq("duplicate_status", "suspected")),
    countInvoices((query) => query.eq("source", "email")),
  ]);

  return {
    total_invoices: totalInvoices,
    processed_today: processedToday,
    pending_review: pendingReview,
    approved,
    failed,
    processing,
    queued,
    uploaded,
    cancelled,
    exported,
    total_amount: null,
    avg_processing_time_minutes: null,
    suspected_duplicates: suspectedDuplicates,
    email_invoices: emailInvoices,
  };
}

/**
 * Fetch dashboard aggregates in one DB call.
 */
async function getDashboardAggregate(): Promise<DashboardAggregateRow> {
  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc(DASHBOARD_STATS_RPC).single();

  if (error) {
    if (isMissingDashboardRpc(error)) {
      return getDashboardAggregateLegacy();
    }
    throw new Error(`Failed to fetch dashboard stats: ${error.message}`);
  }

  return normalizeDashboardAggregate(
    data as Partial<DashboardAggregateRow> | null
  );
}

/**
 * Canonical dashboard stats (OpenAPI field names).
 */
export async function getCanonicalDashboardStats(): Promise<CanonicalDashboardStats> {
  const aggregate = await getDashboardAggregate();
  return {
    total_invoices: aggregate.total_invoices,
    processed_today: aggregate.processed_today,
    pending_review: aggregate.pending_review,
    approved: aggregate.approved,
    failed: aggregate.failed,
    processing: aggregate.processing,
    queued: aggregate.queued,
    uploaded: aggregate.uploaded,
    cancelled: aggregate.cancelled,
    exported: aggregate.exported,
    total_amount: aggregate.total_amount,
    avg_processing_time_minutes: aggregate.avg_processing_time_minutes,
  };
}

/**
 * Compatibility mapper for current dashboard cards.
 */
export function mapCanonicalDashboardStatsToUi(
  stats: CanonicalDashboardStats,
  suspectedDuplicates: number,
  emailInvoices: number
): UiDashboardStats {
  return {
    total: stats.total_invoices,
    pending: stats.pending_review + stats.processing + stats.uploaded,
    approved: stats.approved,
    failed: stats.failed,
    queued: stats.queued,
    exported: stats.exported,
    processed_today: stats.processed_today,
    suspected_duplicates: suspectedDuplicates,
    email_invoices: emailInvoices,
  };
}

/**
 * Fetch a paginated, filterable list of invoices for the current org.
 * RLS ensures only the caller's org rows are returned.
 */
export async function getInvoices(
  filters: InvoiceFilters = {}
): Promise<{ data: Invoice[]; count: number }> {
  const supabase = await createServerClient();

  const page = filters.page ?? DEFAULT_PAGE;
  const perPage = filters.perPage ?? DEFAULT_PER_PAGE;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .from("invoices")
    .select("*", { count: "exact" })
    .order("uploaded_at", { ascending: false })
    .range(from, to);

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.search) {
    // Search across vendor name, invoice number, and original filename
    query = query.or(
      `vendor_name.ilike.%${filters.search}%,invoice_number.ilike.%${filters.search}%,original_filename.ilike.%${filters.search}%`
    );
  }

  if (filters.source && filters.source !== "all") {
    query = query.eq("source", filters.source);
  }

  if (filters.duplicateStatus) {
    query = query.eq("duplicate_status", filters.duplicateStatus);
  }

  if (filters.dateFrom) {
    query = query.or(
      `invoice_date.gte.${filters.dateFrom},invoice_date.is.null`
    );
  }

  if (filters.dateTo) {
    query = query.or(
      `invoice_date.lte.${filters.dateTo},invoice_date.is.null`
    );
  }

  const { data, count, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch invoices: ${error.message}`);
  }

  return {
    data: (data ?? []) as Invoice[],
    count: count ?? 0,
  };
}

/**
 * Fetch invoices that need reviewer attention: suspected duplicates and
 * total amount mismatches.  Limited to ready_for_review + approved statuses.
 */
export async function getReviewRecommendations(): Promise<{
  duplicates: Invoice[];
  mismatches: Invoice[];
}> {
  const supabase = await createServerClient();
  const statuses = ["ready_for_review", "approved"];
  const columns =
    "id, invoice_number, vendor_name, invoice_date, total_amount, status, duplicate_status, has_total_mismatch, uploaded_at";

  const [dupResult, mismatchResult] = await Promise.all([
    supabase
      .from("invoices")
      .select(columns)
      .eq("duplicate_status", "suspected")
      .in("status", statuses)
      .order("uploaded_at", { ascending: false })
      .limit(10),
    supabase
      .from("invoices")
      .select(columns)
      .eq("has_total_mismatch", true)
      .in("status", statuses)
      .order("uploaded_at", { ascending: false })
      .limit(10),
  ]);

  return {
    duplicates: (dupResult.data ?? []) as Invoice[],
    mismatches: (mismatchResult.data ?? []) as Invoice[],
  };
}

/**
 * Fetch a single invoice by ID including its line items.
 * For email-sourced invoices, also resolves email context
 * (from_email, subject, received_at) via the email_attachments -> email_ingestions join.
 */
export async function getInvoiceById(
  id: string
): Promise<InvoiceWithLineItems | null> {
  const supabase = await createServerClient();

  // Fetch invoice and line items in parallel
  const [invoiceResult, lineItemsResult] = await Promise.all([
    supabase.from("invoices").select("*").eq("id", id).single(),
    supabase
      .from("invoice_line_items")
      .select("*")
      .eq("invoice_id", id)
      .order("sort_order", { ascending: true }),
  ]);

  if (invoiceResult.error) {
    if (invoiceResult.error.code === "PGRST116") {
      // Row not found
      return null;
    }
    throw new Error(`Failed to fetch invoice: ${invoiceResult.error.message}`);
  }

  if (lineItemsResult.error) {
    throw new Error(
      `Failed to fetch line items: ${lineItemsResult.error.message}`
    );
  }

  const invoice = invoiceResult.data as Invoice;
  const lineItems = (lineItemsResult.data ?? []) as InvoiceLineItem[];

  const result: InvoiceWithLineItems = {
    ...invoice,
    line_items: lineItems,
  };

  // For invoices with a duplicate group, fetch group members
  if (invoice.duplicate_group_id) {
    const { data: groupMembers } = await supabase
      .from("invoices")
      .select(
        "id, vendor_name, invoice_number, invoice_date, total_amount, status, source, duplicate_status, uploaded_at"
      )
      .eq("duplicate_group_id", invoice.duplicate_group_id)
      .neq("id", invoice.id)
      .order("uploaded_at", { ascending: true });

    if (groupMembers) {
      result.duplicate_group = groupMembers as DuplicateGroupMember[];
    }
  }

  // For email-sourced invoices, resolve the email context
  if (invoice.source === "email") {
    const { data: attachment } = await supabase
      .from("email_attachments")
      .select(
        "email_ingestion_id, email_ingestions(from_email, subject, received_at)"
      )
      .eq("invoice_id", id)
      .limit(1)
      .single();

    if (attachment) {
      // Supabase returns the joined data nested under the FK name
      const ingestion = attachment.email_ingestions as unknown as {
        from_email: string;
        subject: string;
        received_at: string;
      } | null;

      if (ingestion) {
        result.email_context = {
          from_email: ingestion.from_email,
          subject: ingestion.subject,
          received_at: ingestion.received_at,
        };
      }
    }
  }

  return result;
}

/**
 * Fetch a dedicated recent invoices slice for the dashboard table.
 */
export async function getRecentInvoices(limit = 5): Promise<Invoice[]> {
  const supabase = await createServerClient();
  const safeLimit = Math.max(1, Math.min(limit, 50));

  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .order("uploaded_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(safeLimit);

  if (error) {
    throw new Error(`Failed to fetch recent invoices: ${error.message}`);
  }

  return (data ?? []) as Invoice[];
}

/**
 * Count invoices by source for dashboard summary cards.
 */
export async function getInvoiceSourceCount(source: InvoiceSource): Promise<number> {
  return countInvoices((query) => query.eq("source", source));
}

/**
 * Get the org's current normalization config version for stale-config detection.
 */
export async function getOrgConfigVersion(): Promise<number> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("organizations")
    .select("normalization_config_version")
    .single();
  return (data?.normalization_config_version as number) ?? 0;
}

/**
 * Aggregate dashboard stats using canonical contract fields + UI mapping.
 */
export async function getDashboardStats(): Promise<UiDashboardStats> {
  const aggregate = await getDashboardAggregate();

  return mapCanonicalDashboardStatsToUi(
    {
      total_invoices: aggregate.total_invoices,
      processed_today: aggregate.processed_today,
      pending_review: aggregate.pending_review,
      approved: aggregate.approved,
      failed: aggregate.failed,
      processing: aggregate.processing,
      queued: aggregate.queued,
      uploaded: aggregate.uploaded,
      cancelled: aggregate.cancelled,
      exported: aggregate.exported,
      total_amount: aggregate.total_amount,
      avg_processing_time_minutes: aggregate.avg_processing_time_minutes,
    },
    aggregate.suspected_duplicates,
    aggregate.email_invoices
  );
}
