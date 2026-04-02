import type { components } from "@/types/api-contracts";

// Re-export canonical InvoiceStatus from the DB types layer.
// The union values are identical to the OpenAPI-generated enum.
export type { InvoiceStatus } from "./database";

export type ApiMeta = components["schemas"]["ApiMeta"];
export type PaginationMeta = components["schemas"]["PaginationMeta"];

// DashboardStats keeps the API contract shape (field names differ from the
// Supabase query helper in @/types/database). Import from @/types/database
// for Supabase-based dashboard queries in new server-component code.
export type DashboardStats = components["schemas"]["DashboardStats"];
export type InvoiceSummary = components["schemas"]["InvoiceSummary"];
export type InvoiceDetail = components["schemas"]["InvoiceDetail"];
export type ProcessingHistoryRecord =
  components["schemas"]["ProcessingHistoryRecord"];
export type InvoiceStatusPayload =
  components["schemas"]["InvoiceStatusPayload"];
export type UploadResult = components["schemas"]["UploadResult"];
export type UploadResultItem = components["schemas"]["UploadResultItem"];

export type ApiResponse<T> = {
  data: T;
  meta?: ApiMeta | null;
};
