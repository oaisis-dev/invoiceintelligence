import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/authz", () => ({
  requireAuthContext: vi.fn(),
  assertRole: vi.fn(),
}));

import { assertRole, requireAuthContext } from "@/lib/authz";
import * as senderRecommendations from "@/lib/email-sender-recommendations";
import { PATCH } from "./route";

const mockedRequireAuthContext = vi.mocked(requireAuthContext);
const mockedAssertRole = vi.mocked(assertRole);
const mockedApproveSenderRecommendations = vi.spyOn(
  senderRecommendations,
  "approveSenderRecommendations"
);

function createRecommendationRow(locationId: string | null = "loc-1") {
  return {
    id: "rec-1",
    org_id: "org-1",
    location_id: locationId,
    email_account_id: "acct-1",
    sender_email: "ap@vendor.com",
    sender_name: null,
    sample_subject: "Invoice #1001",
    status: "pending",
    source_reason: "subject_keyword_match",
    first_seen_at: "2026-03-15T10:00:00Z",
    last_seen_at: "2026-03-15T10:00:00Z",
    seen_count: 1,
    created_at: "2026-03-15T10:00:00Z",
    updated_at: "2026-03-15T10:00:00Z",
  };
}

function createRecommendationsTable(recommendation: ReturnType<typeof createRecommendationRow>) {
  let currentStatus = recommendation.status;

  const loadBuilder = {
    eq: vi.fn(),
    maybeSingle: vi.fn(async () => ({
      data: { ...recommendation, status: currentStatus },
      error: null,
    })),
  };
  loadBuilder.eq.mockReturnValue(loadBuilder);

  const secondBulkEq = vi.fn(async () => ({
    data: [{ id: recommendation.id, location_id: recommendation.location_id }],
    error: null,
  }));
  const firstBulkEq = vi.fn(() => ({ eq: secondBulkEq }));
  const bulkSelectBuilder = {
    eq: firstBulkEq,
  };

  const updateBuilder = {
    in: vi.fn(async (_column: string, ids: string[]) => {
      if (ids.includes(recommendation.id)) {
        currentStatus = "approved";
      }
      return { error: null };
    }),
  };

  const dismissBuilder = {
    eq: vi.fn(),
    select: vi.fn(),
  };
  dismissBuilder.eq.mockReturnValue(dismissBuilder);
  dismissBuilder.select.mockReturnValue({
    maybeSingle: vi.fn(async () => ({
      data: { ...recommendation, status: "dismissed" },
      error: null,
    })),
  });

  return {
    select: vi.fn((columns: string) =>
      columns === "id, location_id" ? bulkSelectBuilder : loadBuilder
    ),
    update: vi.fn((values: { status: string }) => {
      if (values.status === "dismissed") {
        currentStatus = "dismissed";
        return dismissBuilder;
      }
      return updateBuilder;
    }),
  };
}

function createAllowedSendersTable(locationOverrideIds: Array<string | null> = []) {
  const insertSenderSelect = {
    maybeSingle: vi.fn(async () => ({
      data: {
        id: "sender-1",
        org_id: "org-1",
        location_id: null,
        created_by: "user-1",
        email_address: "ap@vendor.com",
        created_at: "2026-03-15T10:00:00Z",
        updated_at: "2026-03-15T10:00:00Z",
      },
      error: null,
    })),
  };

  return {
    insert: vi.fn(() => ({
      select: vi.fn(() => insertSenderSelect),
    })),
    select: vi.fn(() => ({
      eq: vi.fn(async () => ({
        data: locationOverrideIds.map((locationId) => ({ location_id: locationId })),
        error: null,
      })),
    })),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedAssertRole.mockReturnValue(null);
});

describe("/api/settings/email-accounts/recommendations/[id]", () => {
  it("approves a recommendation at the org scope", async () => {
    const recommendation = createRecommendationRow("loc-1");
    const allowedSenders = createAllowedSendersTable();
    const recommendationTable = createRecommendationsTable(recommendation);

    mockedRequireAuthContext.mockResolvedValue({
      context: {
        orgId: "org-1",
        appUserId: "user-1",
        role: "admin",
        supabase: {
          from: vi.fn((table: string) => {
            if (table === "email_sender_recommendations") return recommendationTable;
            if (table === "email_allowed_senders") return allowedSenders;
            throw new Error(`Unexpected table ${table}`);
          }),
        },
      } as never,
      error: null,
    });

    const response = await PATCH(
      new Request("http://localhost/api/settings/email-accounts/recommendations/rec-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve_org" }),
      }) as never,
      { params: Promise.resolve({ id: "rec-1" }) }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        sender: expect.objectContaining({ id: "sender-1" }),
        recommendation: expect.objectContaining({ status: "approved" }),
      })
    );
  });

  it("dismisses a recommendation", async () => {
    const recommendation = createRecommendationRow("loc-1");
    const recommendationTable = createRecommendationsTable(recommendation);
    mockedRequireAuthContext.mockResolvedValue({
      context: {
        orgId: "org-1",
        appUserId: "user-1",
        role: "admin",
        supabase: {
          from: vi.fn((table: string) => {
            if (table === "email_sender_recommendations") return recommendationTable;
            throw new Error(`Unexpected table ${table}`);
          }),
        },
      } as never,
      error: null,
    });

    const response = await PATCH(
      new Request("http://localhost/api/settings/email-accounts/recommendations/rec-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dismiss" }),
      }) as never,
      { params: Promise.resolve({ id: "rec-1" }) }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      recommendation: expect.objectContaining({ status: "dismissed" }),
    });
  });

  it("rejects location approval when the recommendation is not tied to a location", async () => {
    const recommendation = createRecommendationRow(null);
    const recommendationLoad = {
      maybeSingle: vi.fn(async () => ({ data: recommendation, error: null })),
      eq: vi.fn(),
    };
    recommendationLoad.eq.mockReturnValue(recommendationLoad);
    const recommendationTable = {
      select: vi.fn(() => recommendationLoad),
    };
    mockedRequireAuthContext.mockResolvedValue({
      context: {
        orgId: "org-1",
        appUserId: "user-1",
        role: "admin",
        supabase: {
          from: vi.fn((table: string) => {
            if (table === "email_sender_recommendations") return recommendationTable;
            throw new Error(`Unexpected table ${table}`);
          }),
        },
      } as never,
      error: null,
    });

    const response = await PATCH(
      new Request("http://localhost/api/settings/email-accounts/recommendations/rec-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve_location" }),
      }) as never,
      { params: Promise.resolve({ id: "rec-1" }) }
    );

    expect(response.status).toBe(400);
  });

  it("keeps a location recommendation pending when org approval is blocked by a location override", async () => {
    const recommendation = createRecommendationRow("loc-1");
    const allowedSenders = createAllowedSendersTable(["loc-1"]);
    const recommendationTable = createRecommendationsTable(recommendation);
    mockedRequireAuthContext.mockResolvedValue({
      context: {
        orgId: "org-1",
        appUserId: "user-1",
        role: "admin",
        supabase: {
          from: vi.fn((table: string) => {
            if (table === "email_sender_recommendations") return recommendationTable;
            if (table === "email_allowed_senders") return allowedSenders;
            throw new Error(`Unexpected table ${table}`);
          }),
        },
      } as never,
      error: null,
    });

    const response = await PATCH(
      new Request("http://localhost/api/settings/email-accounts/recommendations/rec-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve_org" }),
      }) as never,
      { params: Promise.resolve({ id: "rec-1" }) }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        recommendation: expect.objectContaining({ status: "pending" }),
      })
    );
  });

  it("keeps the approve response successful if recommendation sync fails", async () => {
    const recommendation = createRecommendationRow("loc-1");
    const allowedSenders = createAllowedSendersTable();
    const recommendationTable = createRecommendationsTable(recommendation);
    mockedRequireAuthContext.mockResolvedValue({
      context: {
        orgId: "org-1",
        appUserId: "user-1",
        role: "admin",
        supabase: {
          from: vi.fn((table: string) => {
            if (table === "email_sender_recommendations") return recommendationTable;
            if (table === "email_allowed_senders") return allowedSenders;
            throw new Error(`Unexpected table ${table}`);
          }),
        },
      } as never,
      error: null,
    });
    mockedApproveSenderRecommendations.mockRejectedValueOnce(
      new Error("sync down")
    );

    const response = await PATCH(
      new Request("http://localhost/api/settings/email-accounts/recommendations/rec-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve_org" }),
      }) as never,
      { params: Promise.resolve({ id: "rec-1" }) }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        recommendation: expect.objectContaining({ status: "pending" }),
        sender: expect.objectContaining({ id: "sender-1" }),
      })
    );
  });

  it("returns the role guard response for managers", async () => {
    mockedRequireAuthContext.mockResolvedValue({
      context: { role: "manager" } as never,
      error: null,
    });
    mockedAssertRole.mockReturnValue(
      NextResponse.json({ error: { code: "FORBIDDEN_ROLE" } }, { status: 403 })
    );

    const response = await PATCH(
      new Request("http://localhost/api/settings/email-accounts/recommendations/rec-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dismiss" }),
      }) as never,
      { params: Promise.resolve({ id: "rec-1" }) }
    );

    expect(response.status).toBe(403);
  });
});
