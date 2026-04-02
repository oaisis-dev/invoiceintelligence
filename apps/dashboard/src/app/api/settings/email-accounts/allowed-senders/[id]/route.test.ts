import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/authz", () => ({
  requireAuthContext: vi.fn(),
  assertRole: vi.fn(),
}));

import { assertRole, requireAuthContext } from "@/lib/authz";
import { DELETE } from "./route";

const mockedRequireAuthContext = vi.mocked(requireAuthContext);
const mockedAssertRole = vi.mocked(assertRole);

function createLoadSenderTable() {
  const selectBuilder = {
    eq: vi.fn(),
    maybeSingle: vi.fn(async () => ({
      data: {
        id: "sender-1",
        location_id: null,
        email_address: "billing@vendor.com",
      },
      error: null,
    })),
  };
  selectBuilder.eq.mockReturnValue(selectBuilder);

  const deleteBuilder = {
    error: null,
    eq: vi.fn(),
  };
  deleteBuilder.eq.mockReturnValue(deleteBuilder);

  return {
    select: vi.fn(() => selectBuilder),
    delete: vi.fn(() => deleteBuilder),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedAssertRole.mockReturnValue(null);
  mockedRequireAuthContext.mockResolvedValue({
    context: {
      orgId: "org-1",
      appUserId: "user-1",
      role: "admin",
      supabase: {
        from: vi.fn(() => createLoadSenderTable()),
      },
    } as never,
    error: null,
  });
});

describe("/api/settings/email-accounts/allowed-senders/[id]", () => {
  it("deletes an allowed sender for owners", async () => {
    const table = createLoadSenderTable();
    mockedRequireAuthContext.mockResolvedValue({
      context: {
        orgId: "org-1",
        appUserId: "user-1",
        role: "admin",
        supabase: { from: vi.fn(() => table) },
      } as never,
      error: null,
    });

    const response = await DELETE(
      new Request("http://localhost/api/settings/email-accounts/allowed-senders/sender-1"),
      { params: Promise.resolve({ id: "sender-1" }) }
    );

    expect(response.status).toBe(204);
  });

  it("returns the role guard response for managers", async () => {
    mockedAssertRole.mockReturnValue(
      NextResponse.json({ error: { code: "FORBIDDEN_ROLE" } }, { status: 403 })
    );

    const response = await DELETE(
      new Request("http://localhost/api/settings/email-accounts/allowed-senders/sender-1"),
      { params: Promise.resolve({ id: "sender-1" }) }
    );

    expect(response.status).toBe(403);
  });
});
