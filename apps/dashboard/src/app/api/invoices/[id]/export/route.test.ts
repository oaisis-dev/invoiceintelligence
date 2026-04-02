import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { POST } from "./route";

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

function createInvoicesBuilder(invoiceStatus = "approved") {
  let mode: "fetch" | "update" = "fetch";
  let updatePayload: Record<string, unknown> | null = null;
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.single = vi.fn(async () => ({
    data:
      mode === "fetch"
        ? {
            id: "inv-1",
            org_id: "org-1",
            location_id: "loc-1",
            status: invoiceStatus,
            vendor_name: "Vendor",
            invoice_number: "123",
            invoice_date: "2026-01-10",
            total_amount: 50.25,
            metadata: {},
          }
        : { id: "inv-1" },
    error: null,
  }));
  builder.update = vi.fn((payload: Record<string, unknown>) => {
    mode = "update";
    updatePayload = payload;
    return builder;
  });
  return { builder, getUpdatePayload: () => updatePayload };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedAssertRole.mockReturnValue(null);
  mockedAssertLocationAccess.mockReturnValue(null);
});

describe("POST /api/invoices/[id]/export", () => {
  it("exports invoice using per-location destination and writes canonical audit", async () => {
    const invoicesState = createInvoicesBuilder("approved");
    const organizationsBuilder: Record<string, ReturnType<typeof vi.fn>> = {
      select: vi.fn(() => organizationsBuilder),
      eq: vi.fn(() => organizationsBuilder),
      single: vi.fn(async () => ({
        data: {
          settings: {
            export_routing: {
              mode: "per_location",
              org_default_destination: "gsheets://org-default",
              location_overrides: { "loc-1": "gsheets://loc-1" },
            },
          },
        },
        error: null,
      })),
    };
    const lineItemsBuilder: Record<string, ReturnType<typeof vi.fn>> = {
      select: vi.fn(() => lineItemsBuilder),
      eq: vi.fn(() => lineItemsBuilder),
      order: vi.fn(async () => ({ data: [], error: null })),
    };

    mockedRequireAuthContext.mockResolvedValue({
      context: {
        appUserId: "user-1",
        orgId: "org-1",
        role: "manager",
        locationId: "loc-1",
        supabase: {
          from: vi.fn((table: string) => {
            if (table === "invoices") return invoicesState.builder;
            if (table === "organizations") return organizationsBuilder;
            if (table === "invoice_line_items") return lineItemsBuilder;
            throw new Error(`Unexpected table ${table}`);
          }),
        },
      } as never,
      error: null,
    });

    const response = await POST(new Request("http://localhost") as never, {
      params: Promise.resolve({ id: "inv-1" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    expect(response.headers.get("Content-Disposition")).toContain(
      "invoice-123.xlsx"
    );

    // Verify body is a non-empty binary payload
    const buffer = await response.arrayBuffer();
    expect(buffer.byteLength).toBeGreaterThan(0);

    expect(invoicesState.getUpdatePayload()).toEqual(
      expect.objectContaining({ status: "exported" })
    );
  });

  it("returns role guard response for staff", async () => {
    mockedRequireAuthContext.mockResolvedValue({
      context: { role: "staff" } as never,
      error: null,
    });
    mockedAssertRole.mockReturnValue(
      NextResponse.json({ error: { code: "FORBIDDEN_ROLE" } }, { status: 403 })
    );

    const response = await POST(new Request("http://localhost") as never, {
      params: Promise.resolve({ id: "inv-1" }),
    });
    expect(response.status).toBe(403);
  });
});
