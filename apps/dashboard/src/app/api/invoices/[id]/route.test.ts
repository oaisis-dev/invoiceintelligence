import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { PUT } from "./route";

vi.mock("@/lib/authz", () => ({
  requireAuthContext: vi.fn(),
  assertRole: vi.fn(),
  assertLocationAccess: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import {
  assertLocationAccess,
  assertRole,
  requireAuthContext,
} from "@/lib/authz";

const mockedRequireAuthContext = vi.mocked(requireAuthContext);
const mockedAssertRole = vi.mocked(assertRole);
const mockedAssertLocationAccess = vi.mocked(assertLocationAccess);

beforeEach(() => {
  vi.clearAllMocks();
  mockedAssertRole.mockReturnValue(null);
  mockedAssertLocationAccess.mockReturnValue(null);
});

function createInvoicesBuilder(options?: {
  status?: string;
  updateError?: { message: string } | null;
}) {
  const status = options?.status ?? "exported";
  let fetchMode: "initial" | "refetch" = "initial";
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.single = vi.fn(async () => {
    if (fetchMode === "initial") {
      return {
        data: { id: "inv-1", status, location_id: "loc-1" },
        error: null,
      };
    }
    return {
      data: { id: "inv-1", status: "exported", vendor_name: "Corrected" },
      error: null,
    };
  });
  builder.update = vi.fn(() => {
    fetchMode = "refetch";
    return builder;
  });
  return builder;
}

describe("PUT /api/invoices/[id]", () => {
  it("allows corrections in editable statuses and records canonical audit", async () => {
    const invoicesBuilder = createInvoicesBuilder();
    const lineItemsBuilder: Record<string, ReturnType<typeof vi.fn>> = {
      delete: vi.fn(() => lineItemsBuilder),
      eq: vi.fn(() => lineItemsBuilder),
      insert: vi.fn(async () => ({ error: null })),
    };

    mockedRequireAuthContext.mockResolvedValue({
      context: {
        role: "staff",
        locationId: "loc-1",
        supabase: {
          from: vi.fn((table: string) => {
            if (table === "invoices") return invoicesBuilder;
            if (table === "invoice_line_items") return lineItemsBuilder;
            throw new Error(`Unexpected table ${table}`);
          }),
        },
      } as never,
      error: null,
    });

    const request = new Request("http://localhost", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ vendor_name: "Corrected" }),
    });

    const response = await PUT(request as never, {
      params: Promise.resolve({ id: "inv-1" }),
    });

    expect(response.status).toBe(200);
  });

  it("requires manager/admin role when cancelling invoice", async () => {
    const invoicesBuilder = createInvoicesBuilder({ status: "ready_for_review" });
    mockedRequireAuthContext.mockResolvedValue({
      context: {
        role: "staff",
        locationId: "loc-1",
        supabase: {
          from: vi.fn((table: string) => {
            if (table !== "invoices") throw new Error("Unexpected table");
            return invoicesBuilder;
          }),
        },
      } as never,
      error: null,
    });
    mockedAssertRole.mockReturnValue(
      NextResponse.json({ error: { code: "FORBIDDEN_ROLE" } }, { status: 403 })
    );

    const request = new Request("http://localhost", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });

    const response = await PUT(request as never, {
      params: Promise.resolve({ id: "inv-1" }),
    });

    expect(response.status).toBe(403);
  });
});
