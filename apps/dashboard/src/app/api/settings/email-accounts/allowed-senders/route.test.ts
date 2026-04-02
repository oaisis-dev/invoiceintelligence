import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/authz", () => ({
  requireAuthContext: vi.fn(),
  assertRole: vi.fn(),
}));

vi.mock("@/lib/default-location", () => ({
  getDefaultLocationForOrg: vi.fn(),
}));

import { assertRole, requireAuthContext } from "@/lib/authz";
import { getDefaultLocationForOrg } from "@/lib/default-location";
import * as senderRecommendations from "@/lib/email-sender-recommendations";
import { POST } from "./route";

const mockedRequireAuthContext = vi.mocked(requireAuthContext);
const mockedAssertRole = vi.mocked(assertRole);
const mockedGetDefaultLocationForOrg = vi.mocked(getDefaultLocationForOrg);
const mockedApproveSenderRecommendations = vi.spyOn(
  senderRecommendations,
  "approveSenderRecommendations"
);

function createRecommendationsTable() {
  const secondEq = vi.fn(async () => ({
    data: [{ id: "rec-1", location_id: "loc-1" }],
    error: null,
  }));
  const firstEq = vi.fn(() => ({ eq: secondEq }));

  const updateBuilder = {
    in: vi.fn(async () => ({ error: null })),
  };

  return {
    select: vi.fn(() => ({ eq: firstEq })),
    update: vi.fn(() => updateBuilder),
  };
}

function createAllowedSendersTable(sender: Record<string, unknown>) {
  const selectResult = {
    maybeSingle: vi.fn(async () => ({ data: sender, error: null })),
  };
  const locationOverridesSelect = {
    eq: vi.fn(async () => ({
      data: [],
      error: null,
    })),
  };
  return {
    insert: vi.fn(() => ({
      select: vi.fn(() => selectResult),
    })),
    select: vi.fn(() => locationOverridesSelect),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedAssertRole.mockReturnValue(null);
  mockedGetDefaultLocationForOrg.mockResolvedValue({
    id: "loc-1",
    name: "Main",
  } as never);
  mockedRequireAuthContext.mockResolvedValue({
    context: {
      orgId: "org-1",
      appUserId: "user-1",
      role: "admin",
      supabase: {
        from: vi.fn(),
      },
    } as never,
    error: null,
  });
});

describe("/api/settings/email-accounts/allowed-senders", () => {
  it("creates an org-level allowed sender for owners", async () => {
    const sender = {
      id: "sender-1",
      org_id: "org-1",
      location_id: null,
      created_by: "user-1",
      email_address: "billing@vendor.com",
      created_at: "2026-03-15T10:00:00Z",
      updated_at: "2026-03-15T10:00:00Z",
    };
    const allowedSenders = createAllowedSendersTable(sender);
    const recommendations = createRecommendationsTable();
    const from = vi.fn((table: string) => {
      if (table === "email_allowed_senders") return allowedSenders;
      if (table === "email_sender_recommendations") return recommendations;
      throw new Error(`Unexpected table ${table}`);
    });
    mockedRequireAuthContext.mockResolvedValue({
      context: {
        orgId: "org-1",
        appUserId: "user-1",
        role: "admin",
        supabase: { from },
      } as never,
      error: null,
    });

    const response = await POST(
      new Request("http://localhost/api/settings/email-accounts/allowed-senders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "org",
          email_address: " Billing@Vendor.com ",
        }),
      }) as never
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      sender: expect.objectContaining({
        id: "sender-1",
        email_address: "billing@vendor.com",
        location_id: null,
      }),
    });
  });

  it("returns the role guard response for managers", async () => {
    mockedAssertRole.mockReturnValue(
      NextResponse.json({ error: { code: "FORBIDDEN_ROLE" } }, { status: 403 })
    );

    const response = await POST(
      new Request("http://localhost/api/settings/email-accounts/allowed-senders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "org",
          email_address: "billing@vendor.com",
        }),
      }) as never
    );

    expect(response.status).toBe(403);
  });

  it("keeps the create response successful if audit logging fails", async () => {
    const sender = {
      id: "sender-1",
      org_id: "org-1",
      location_id: null,
      created_by: "user-1",
      email_address: "billing@vendor.com",
      created_at: "2026-03-15T10:00:00Z",
      updated_at: "2026-03-15T10:00:00Z",
    };
    const allowedSenders = createAllowedSendersTable(sender);
    const recommendations = createRecommendationsTable();
    const from = vi.fn((table: string) => {
      if (table === "email_allowed_senders") return allowedSenders;
      if (table === "email_sender_recommendations") return recommendations;
      throw new Error(`Unexpected table ${table}`);
    });
    mockedRequireAuthContext.mockResolvedValue({
      context: {
        orgId: "org-1",
        appUserId: "user-1",
        role: "admin",
        supabase: { from },
      } as never,
      error: null,
    });
    const response = await POST(
      new Request("http://localhost/api/settings/email-accounts/allowed-senders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "org",
          email_address: "billing@vendor.com",
        }),
      }) as never
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      sender: expect.objectContaining({ id: "sender-1" }),
    });
  });

  it("keeps the create response successful if recommendation sync fails", async () => {
    const sender = {
      id: "sender-1",
      org_id: "org-1",
      location_id: null,
      created_by: "user-1",
      email_address: "billing@vendor.com",
      created_at: "2026-03-15T10:00:00Z",
      updated_at: "2026-03-15T10:00:00Z",
    };
    const allowedSenders = createAllowedSendersTable(sender);
    const recommendations = createRecommendationsTable();
    const from = vi.fn((table: string) => {
      if (table === "email_allowed_senders") return allowedSenders;
      if (table === "email_sender_recommendations") return recommendations;
      throw new Error(`Unexpected table ${table}`);
    });
    mockedRequireAuthContext.mockResolvedValue({
      context: {
        orgId: "org-1",
        appUserId: "user-1",
        role: "admin",
        supabase: { from },
      } as never,
      error: null,
    });
    mockedApproveSenderRecommendations.mockRejectedValueOnce(
      new Error("sync down")
    );

    const response = await POST(
      new Request("http://localhost/api/settings/email-accounts/allowed-senders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "org",
          email_address: "billing@vendor.com",
        }),
      }) as never
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      sender: expect.objectContaining({ id: "sender-1" }),
    });
  });
});
