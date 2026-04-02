import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/authz", () => ({
  requireAuthContext: vi.fn(),
  assertLocationAccess: vi.fn(),
}));

const mockProxyToBackendApi = vi.fn();
vi.mock("@/lib/backend-api", () => ({
  proxyToBackendApi: (...args: unknown[]) => mockProxyToBackendApi(...args),
}));

import { GET } from "./route";
import { assertLocationAccess, requireAuthContext } from "@/lib/authz";

const mockedRequireAuthContext = vi.mocked(requireAuthContext);
const mockedAssertLocationAccess = vi.mocked(assertLocationAccess);

beforeEach(() => {
  vi.clearAllMocks();
  mockedAssertLocationAccess.mockReturnValue(null);
});

describe("GET /api/invoices/[id]/history", () => {
  it("proxies to backend-api activity-events endpoint", async () => {
    const invoicesBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
    invoicesBuilder.select = vi.fn(() => invoicesBuilder);
    invoicesBuilder.eq = vi.fn(() => invoicesBuilder);
    invoicesBuilder.single = vi.fn(async () => ({
      data: { id: "inv-1", location_id: "loc-1" },
      error: null,
    }));

    mockedRequireAuthContext.mockResolvedValue({
      context: {
        orgId: "org-1",
        supabase: {
          from: vi.fn(() => invoicesBuilder),
        },
      } as never,
      error: null,
    });

    const proxyResponse = NextResponse.json({
      events: [
        {
          id: "e1",
          action: "invoice_uploaded",
          created_at: "2026-02-17T10:00:00Z",
        },
      ],
    });
    mockProxyToBackendApi.mockResolvedValue(proxyResponse);

    const response = await GET(new Request("http://localhost") as never, {
      params: Promise.resolve({ id: "inv-1" }),
    });

    expect(response).toBe(proxyResponse);
    expect(mockProxyToBackendApi).toHaveBeenCalledWith(
      "/api/org/activity-events/by-resource",
      {
        searchParams: expect.any(URLSearchParams),
      }
    );

    // Verify the search params passed to the proxy
    const callArgs = mockProxyToBackendApi.mock.calls[0];
    const searchParams = callArgs[1].searchParams as URLSearchParams;
    expect(searchParams.get("resource_type")).toBe("invoice");
    expect(searchParams.get("resource_id")).toBe("inv-1");
  });

  it("returns 404 when invoice not found", async () => {
    const invoicesBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
    invoicesBuilder.select = vi.fn(() => invoicesBuilder);
    invoicesBuilder.eq = vi.fn(() => invoicesBuilder);
    invoicesBuilder.single = vi.fn(async () => ({
      data: null,
      error: { message: "Not found" },
    }));

    mockedRequireAuthContext.mockResolvedValue({
      context: {
        orgId: "org-1",
        supabase: {
          from: vi.fn(() => invoicesBuilder),
        },
      } as never,
      error: null,
    });

    const response = await GET(new Request("http://localhost") as never, {
      params: Promise.resolve({ id: "inv-999" }),
    });

    expect(response.status).toBe(404);
    expect(mockProxyToBackendApi).not.toHaveBeenCalled();
  });

  it("returns location guard response when location access fails", async () => {
    const invoicesBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
    invoicesBuilder.select = vi.fn(() => invoicesBuilder);
    invoicesBuilder.eq = vi.fn(() => invoicesBuilder);
    invoicesBuilder.single = vi.fn(async () => ({
      data: { id: "inv-1", location_id: "loc-2" },
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
    expect(mockProxyToBackendApi).not.toHaveBeenCalled();
  });
});
