import { createServerClient } from "@/lib/supabase/server";
import type {
  SpendByPeriod,
  VendorSpend,
  ProcessingMetric,
} from "@/types/analytics";

// ---------------------------------------------------------------------------
// Analytics query functions — call the RPCs defined in
// 0046_analytics_rpcs.up.sql. Each returns an empty array on error so the
// dashboard degrades gracefully when the migration hasn't been applied yet.
// ---------------------------------------------------------------------------

/**
 * Spend aggregated by time period (day / week / month).
 * Only includes approved and exported invoices.
 */
export async function getSpendByPeriod(
  interval: string,
  startDate: string,
  endDate: string,
): Promise<SpendByPeriod[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc("get_spend_by_period", {
    p_interval: interval,
    p_start: startDate,
    p_end: endDate,
  });

  if (error) {
    console.error("get_spend_by_period failed:", error.message);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => ({
    period_start: String(row.period_start ?? ""),
    invoice_count: Number(row.invoice_count ?? 0),
    total_amount: Number(row.total_amount ?? 0),
  }));
}

/**
 * Top N vendors by total spend in the given date range.
 */
export async function getSpendByVendor(
  startDate: string,
  endDate: string,
  limit = 10,
): Promise<VendorSpend[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc("get_spend_by_vendor", {
    p_start: startDate,
    p_end: endDate,
    p_limit: limit,
  });

  if (error) {
    console.error("get_spend_by_vendor failed:", error.message);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => ({
    vendor_name: String(row.vendor_name ?? "Unknown"),
    invoice_count: Number(row.invoice_count ?? 0),
    total_amount: Number(row.total_amount ?? 0),
    pct_of_total: Number(row.pct_of_total ?? 0),
  }));
}

/**
 * Processing volume and performance metrics by time period.
 */
export async function getProcessingMetrics(
  interval: string,
  startDate: string,
  endDate: string,
): Promise<ProcessingMetric[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc(
    "get_processing_metrics_by_period",
    {
      p_interval: interval,
      p_start: startDate,
      p_end: endDate,
    },
  );

  if (error) {
    console.error("get_processing_metrics_by_period failed:", error.message);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => ({
    period_start: String(row.period_start ?? ""),
    processed_count: Number(row.processed_count ?? 0),
    avg_processing_minutes:
      row.avg_processing_minutes == null
        ? null
        : Number(row.avg_processing_minutes),
    failed_count: Number(row.failed_count ?? 0),
  }));
}
