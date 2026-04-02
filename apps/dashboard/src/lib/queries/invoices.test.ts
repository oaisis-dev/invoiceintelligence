import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InvoiceSource } from "@/types/database";

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn(),
}));

import { createServerClient } from "@/lib/supabase/server";
import {
  getCanonicalDashboardStats,
  getDashboardStats,
  getInvoiceSourceCount,
  getRecentInvoices,
  mapCanonicalDashboardStatsToUi,
} from "./invoices";

type QueryResult = {
  data: unknown;
  count?: number | null;
  error: { message: string; code?: string } | null;
};

type MockBuilder = ReturnType<typeof createMockBuilder>;

function createMockBuilder(result: QueryResult) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  const chainMethods = [
    "select",
    "eq",
    "neq",
    "gte",
    "lte",
    "ilike",
    "or",
    "order",
    "range",
    "limit",
  ] as const;

  for (const method of chainMethods) {
    builder[method] = vi.fn().mockReturnValue(builder);
  }

  builder.single = vi.fn().mockResolvedValue(result);
  builder.then = vi.fn((resolve: (value: QueryResult) => void) =>
    resolve(result)
  );

  return builder;
}

function createMockSupabase(resultQueue: QueryResult[]) {
  const calls: Array<{ table: string; builder: MockBuilder }> = [];
  const rpcCalls: Array<{ fn: string; builder: MockBuilder }> = [];

  const from = vi.fn((table: string) => {
    const nextResult = resultQueue.shift() ?? {
      data: [],
      count: 0,
      error: null,
    };
    const builder = createMockBuilder(nextResult);
    calls.push({ table, builder });
    return builder;
  });

  const rpc = vi.fn((fn: string) => {
    const nextResult = resultQueue.shift() ?? {
      data: null,
      count: null,
      error: null,
    };
    const builder = createMockBuilder(nextResult);
    rpcCalls.push({ fn, builder });
    return builder;
  });

  return {
    client: { from, rpc },
    calls,
    rpcCalls,
  };
}

const mockedCreateServerClient = vi.mocked(createServerClient);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("invoices query helpers", () => {
  it("returns canonical dashboard stats with required OpenAPI fields", async () => {
    const { client, calls, rpcCalls } = createMockSupabase([
      {
        data: {
          total_invoices: 50,
          pending_review: 12,
          approved: 9,
          failed: 4,
          processing: 7,
          queued: 3,
          uploaded: 6,
          cancelled: 2,
          exported: 5,
          processed_today: 18,
          total_amount: null,
          avg_processing_time_minutes: null,
          suspected_duplicates: 4,
          email_invoices: 19,
        },
        error: null,
      },
    ]);

    mockedCreateServerClient.mockResolvedValue(client as never);

    const stats = await getCanonicalDashboardStats();

    expect(stats).toMatchObject({
      total_invoices: 50,
      pending_review: 12,
      approved: 9,
      failed: 4,
      processing: 7,
      queued: 3,
      uploaded: 6,
      cancelled: 2,
      exported: 5,
      processed_today: 18,
      total_amount: null,
      avg_processing_time_minutes: null,
    });

    expect(calls).toHaveLength(0);
    expect(rpcCalls[0]?.fn).toBe("get_dashboard_stats_aggregate");
  });

  it("maps canonical dashboard stats to current UI card shape", () => {
    const mapped = mapCanonicalDashboardStatsToUi(
      {
        total_invoices: 100,
        pending_review: 11,
        approved: 20,
        failed: 3,
        processing: 7,
        queued: 5,
        uploaded: 9,
        cancelled: 2,
        exported: 8,
        processed_today: 14,
        total_amount: null,
        avg_processing_time_minutes: null,
      },
      6,
      41
    );

    expect(mapped).toEqual({
      total: 100,
      pending: 27,
      approved: 20,
      failed: 3,
      queued: 5,
      exported: 8,
      processed_today: 14,
      suspected_duplicates: 6,
      email_invoices: 41,
    });
  });

  it("uses aggregate RPC for UI dashboard stats", async () => {
    const { client, rpcCalls } = createMockSupabase([
      {
        data: {
          total_invoices: 12,
          pending_review: 3,
          approved: 4,
          failed: 1,
          processing: 2,
          queued: 1,
          uploaded: 5,
          cancelled: 1,
          exported: 0,
          processed_today: 7,
          total_amount: null,
          avg_processing_time_minutes: null,
          suspected_duplicates: 2,
          email_invoices: 9,
        },
        error: null,
      },
    ]);

    mockedCreateServerClient.mockResolvedValue(client as never);

    const stats = await getDashboardStats();

    expect(stats.suspected_duplicates).toBe(2);
    expect(stats.email_invoices).toBe(9);
    expect(rpcCalls[0]?.fn).toBe("get_dashboard_stats_aggregate");
  });

  it("falls back to legacy count queries when RPC is missing", async () => {
    const { client, calls, rpcCalls } = createMockSupabase([
      {
        data: null,
        error: {
          code: "PGRST202",
          message:
            "Could not find the function public.get_dashboard_stats_aggregate without parameters in the schema cache",
        },
      },
      { data: null, count: 20, error: null },
      { data: null, count: 5, error: null },
      { data: null, count: 4, error: null },
      { data: null, count: 1, error: null },
      { data: null, count: 2, error: null },
      { data: null, count: 3, error: null },
      { data: null, count: 2, error: null },
      { data: null, count: 1, error: null },
      { data: null, count: 6, error: null },
      { data: null, count: 9, error: null },
      { data: null, count: 2, error: null },
      { data: null, count: 7, error: null },
    ]);

    mockedCreateServerClient.mockResolvedValue(client as never);

    const stats = await getDashboardStats();

    expect(rpcCalls[0]?.fn).toBe("get_dashboard_stats_aggregate");
    expect(calls).toHaveLength(12);
    expect(stats).toMatchObject({
      total: 20,
      pending: 9,
      approved: 4,
      failed: 1,
      queued: 3,
      exported: 6,
      processed_today: 9,
      suspected_duplicates: 2,
      email_invoices: 7,
    });
  });

  it("returns recent invoices with deterministic order and limit", async () => {
    const invoices = [{ id: "inv-1" }, { id: "inv-2" }];
    const { client, calls } = createMockSupabase([
      { data: invoices, count: null, error: null },
    ]);

    mockedCreateServerClient.mockResolvedValue(client as never);

    const data = await getRecentInvoices(5);

    expect(data).toEqual(invoices);
    expect(calls[0]?.builder.order).toHaveBeenNthCalledWith(1, "uploaded_at", {
      ascending: false,
    });
    expect(calls[0]?.builder.order).toHaveBeenNthCalledWith(2, "id", {
      ascending: false,
    });
    expect(calls[0]?.builder.limit).toHaveBeenCalledWith(5);
  });

  it("returns source-specific count without loading full invoice rows", async () => {
    const { client, calls } = createMockSupabase([
      { data: null, count: 14, error: null },
    ]);

    mockedCreateServerClient.mockResolvedValue(client as never);

    const count = await getInvoiceSourceCount("email" satisfies InvoiceSource);

    expect(count).toBe(14);
    expect(calls[0]?.builder.select).toHaveBeenCalledWith("id", {
      head: true,
      count: "exact",
    });
    expect(calls[0]?.builder.eq).toHaveBeenCalledWith("source", "email");
  });
});
