import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { GET } from "./route";

vi.mock("@/lib/authz", () => ({
  requireAuthContext: vi.fn(),
  assertLocationAccess: vi.fn(),
}));

import { assertLocationAccess, requireAuthContext } from "@/lib/authz";

const mockedRequireAuthContext = vi.mocked(requireAuthContext);
const mockedAssertLocationAccess = vi.mocked(assertLocationAccess);

beforeEach(() => {
  vi.clearAllMocks();
  mockedAssertLocationAccess.mockReturnValue(null);
});

describe("GET /api/invoices/[id]/status", () => {
  it("returns invoice status payload for authorized users", async () => {
    const invoicesBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
    invoicesBuilder.select = vi.fn(() => invoicesBuilder);
    invoicesBuilder.eq = vi.fn(() => invoicesBuilder);
    invoicesBuilder.single = vi.fn(async () => ({
      data: {
        id: "inv-1",
        status: "processing",
        progress: 45,
        processing_stage: "ocr",
        error_message: null,
        updated_at: "2026-02-16T00:00:00.000Z",
        location_id: "loc-1",
      },
      error: null,
    }));

    mockedRequireAuthContext.mockResolvedValue({
      context: {
        supabase: {
          from: vi.fn((table: string) => {
            if (table !== "invoices") {
              throw new Error(`Unexpected table: ${table}`);
            }
            return invoicesBuilder;
          }),
        },
      } as never,
      error: null,
    });

    const response = await GET(new Request("http://localhost") as never, {
      params: Promise.resolve({ id: "inv-1" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      id: "inv-1",
      status: "processing",
      progress: 45,
      processing_stage: "ocr",
      error_message: null,
      updated_at: "2026-02-16T00:00:00.000Z",
    });
  });

  it("returns location guard response when location scope fails", async () => {
    const invoicesBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
    invoicesBuilder.select = vi.fn(() => invoicesBuilder);
    invoicesBuilder.eq = vi.fn(() => invoicesBuilder);
    invoicesBuilder.single = vi.fn(async () => ({
      data: {
        id: "inv-1",
        status: "processing",
        location_id: "loc-2",
      },
      error: null,
    }));

    mockedRequireAuthContext.mockResolvedValue({
      context: {
        supabase: { from: vi.fn(() => invoicesBuilder) },
      } as never,
      error: null,
    });
    mockedAssertLocationAccess.mockReturnValue(
      NextResponse.json(
        { error: { code: "LOCATION_SCOPE_VIOLATION" } },
        { status: 403 }
      )
    );

    const response = await GET(new Request("http://localhost") as never, {
      params: Promise.resolve({ id: "inv-1" }),
    });

    expect(response.status).toBe(403);
  });
});
