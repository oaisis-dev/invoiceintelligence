import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

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
import { POST } from "./route";

const mockedRequireAuthContext = vi.mocked(requireAuthContext);
const mockedAssertRole = vi.mocked(assertRole);
const mockedAssertLocationAccess = vi.mocked(assertLocationAccess);

type QueryResult = {
  data: unknown;
  error: { message: string } | null;
};

function createInvoicesBuilder(results: QueryResult[]) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.single = vi.fn(async () => {
    const next = results.shift();
    if (!next) {
      throw new Error("Unexpected invoices.single() call");
    }
    return next;
  });
  builder.update = vi.fn(() => builder);
  return builder;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedAssertRole.mockReturnValue(null);
  mockedAssertLocationAccess.mockReturnValue(null);
});

describe("POST /api/invoices/[id]/approve", () => {
  it("approves invoice and records canonical audit event", async () => {
    const invoicesBuilder = createInvoicesBuilder([
      {
        data: { id: "inv-1", status: "ready_for_review", location_id: "loc-1" },
        error: null,
      },
      {
        data: { id: "inv-1", status: "approved" },
        error: null,
      },
    ]);

    mockedRequireAuthContext.mockResolvedValue({
      context: {
        clerkUserId: "clerk-1",
        appUserId: "user-1",
        orgId: "org-1",
        role: "manager",
        locationId: "loc-1",
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

    const response = await POST(new Request("http://localhost") as never, {
      params: Promise.resolve({ id: "inv-1" }),
    });

    expect(response.status).toBe(200);
  });

  it("returns role guard response when non-manager/admin attempts approve", async () => {
    mockedRequireAuthContext.mockResolvedValue({
      context: {
        role: "staff",
      } as never,
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
