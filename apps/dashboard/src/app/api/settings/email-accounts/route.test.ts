import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { GET } from "./route";

vi.mock("@/lib/authz", () => ({
  requireAuthContext: vi.fn(),
  assertRole: vi.fn(),
}));

vi.mock("@/lib/default-location", () => ({
  getDefaultLocationForOrg: vi.fn(),
}));

import { assertRole, requireAuthContext } from "@/lib/authz";
import { getDefaultLocationForOrg } from "@/lib/default-location";

const mockedRequireAuthContext = vi.mocked(requireAuthContext);
const mockedAssertRole = vi.mocked(assertRole);
const mockedGetDefaultLocationForOrg = vi.mocked(getDefaultLocationForOrg);

function createEmailAccountsBuilder() {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.order = vi.fn(() => builder);
  builder.limit = vi.fn(() => builder);
  builder.maybeSingle = vi.fn(async () => ({
    data: {
      id: "acct-1",
      org_id: "org-1",
      location_id: "loc-1",
      provider: "google",
      email_address: "billing@example.com",
      token_expires_at: null,
      subject_filter: "Invoice Upload",
      is_active: true,
      last_polled_at: "2026-03-14T08:00:00Z",
      last_verified_at: "2026-03-14T07:55:00Z",
      last_verification_status: "verified",
      last_verification_error: null,
      last_error: null,
      consecutive_failures: 0,
      disconnected_at: null,
      created_at: "2026-03-10T10:00:00Z",
      updated_at: "2026-03-14T08:00:00Z",
      location: {
        id: "loc-1",
        name: "Main",
        is_default: true,
      },
    },
    error: null,
  }));
  return builder;
}

function createAllowedSendersBuilder() {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.or = vi.fn(() => builder);
  builder.order = vi.fn(async () => ({
    data: [
      {
        id: "sender-org-1",
        org_id: "org-1",
        location_id: null,
        created_by: "user-1",
        email_address: "billing@vendor.com",
        created_at: "2026-03-10T10:00:00Z",
        updated_at: "2026-03-10T10:00:00Z",
      },
    ],
    error: null,
  }));
  return builder;
}

function createRecommendationsBuilder() {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.order = vi.fn(async () => ({
    data: [
      {
        id: "rec-1",
        org_id: "org-1",
        location_id: "loc-1",
        email_account_id: "acct-1",
        sender_email: "ap@vendor.com",
        sender_name: null,
        sample_subject: "Invoice #1001",
        status: "pending",
        source_reason: "subject_keyword_match",
        first_seen_at: "2026-03-14T07:50:00Z",
        last_seen_at: "2026-03-14T08:00:00Z",
        seen_count: 2,
        created_at: "2026-03-14T07:50:00Z",
        updated_at: "2026-03-14T08:00:00Z",
      },
    ],
    error: null,
  }));
  return builder;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedAssertRole.mockReturnValue(null);
  mockedGetDefaultLocationForOrg.mockResolvedValue({
    id: "loc-1",
    name: "Main",
  } as never);
});

describe("/api/settings/email-accounts", () => {
  it("allows managers to read inbox health", async () => {
    const emailAccounts = createEmailAccountsBuilder();
    const allowedSenders = createAllowedSendersBuilder();
    const recommendations = createRecommendationsBuilder();

    mockedRequireAuthContext.mockResolvedValue({
      context: {
        orgId: "org-1",
        role: "manager",
        supabase: {
          from: vi.fn((table: string) => {
            if (table === "email_accounts") return emailAccounts;
            if (table === "email_allowed_senders") return allowedSenders;
            if (table === "email_sender_recommendations") return recommendations;
            throw new Error(`Unexpected table ${table}`);
          }),
        },
      } as never,
      error: null,
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(mockedAssertRole).toHaveBeenCalledWith(
      expect.objectContaining({ role: "manager" }),
      ["admin", "manager"]
    );

    const body = await response.json();
    expect(body.accounts).toHaveLength(1);
    expect(body.accounts[0]).toEqual(
      expect.objectContaining({
        email_address: "billing@example.com",
        last_verification_status: "verified",
        location: expect.objectContaining({ name: "Main", is_default: true }),
      })
    );
    expect(body.sender_policy).toEqual(
      expect.objectContaining({
        mode: "enforcement",
        effective_scope: "org",
        default_location: { id: "loc-1", name: "Main" },
        org_allowed_senders: [
          expect.objectContaining({ email_address: "billing@vendor.com" }),
        ],
        location_allowed_senders: [],
      })
    );
    expect(body.recommendations).toEqual([
      expect.objectContaining({ sender_email: "ap@vendor.com" }),
    ]);
  });

  it("returns only the current inbox row", async () => {
    const emailAccounts = createEmailAccountsBuilder();
    const allowedSenders = createAllowedSendersBuilder();
    const recommendations = createRecommendationsBuilder();

    mockedRequireAuthContext.mockResolvedValue({
      context: {
        orgId: "org-1",
        role: "manager",
        supabase: {
          from: vi.fn((table: string) => {
            if (table === "email_accounts") return emailAccounts;
            if (table === "email_allowed_senders") return allowedSenders;
            if (table === "email_sender_recommendations") return recommendations;
            throw new Error(`Unexpected table ${table}`);
          }),
        },
      } as never,
      error: null,
    });

    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.accounts).toEqual([
      expect.objectContaining({
        email_address: "billing@example.com",
      }),
    ]);
    expect(emailAccounts.maybeSingle).toHaveBeenCalledTimes(1);
  });

  it("returns the role guard response for unauthorized roles", async () => {
    mockedRequireAuthContext.mockResolvedValue({
      context: { role: "staff" } as never,
      error: null,
    });
    mockedAssertRole.mockReturnValue(
      NextResponse.json({ error: { code: "FORBIDDEN_ROLE" } }, { status: 403 })
    );

    const response = await GET();
    expect(response.status).toBe(403);
  });
});
