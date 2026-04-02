// ---------------------------------------------------------------------------
// Analytics types — match the Postgres RPC return shapes from
// 0046_analytics_rpcs.up.sql.
// ---------------------------------------------------------------------------

export type SpendByPeriod = {
  period_start: string;
  invoice_count: number;
  total_amount: number;
};

export type VendorSpend = {
  vendor_name: string;
  invoice_count: number;
  total_amount: number;
  pct_of_total: number;
};

export type ProcessingMetric = {
  period_start: string;
  processed_count: number;
  avg_processing_minutes: number | null;
  failed_count: number;
};

/** Supported date range presets for the dashboard. */
export type DateRangePreset = "7d" | "30d" | "90d" | "12m";
