import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/authz", () => ({
  requireAuthContext: vi.fn(),
  assertRole: vi.fn(),
}));

vi.mock("@/lib/default-location", () => ({
  getDefaultLocationForOrg: vi.fn(),
  syncDefaultLocationInboxEmail: vi.fn(),
}));

import { assertRole, requireAuthContext } from "@/lib/authz";
import {
  getDefaultLocationForOrg,
  syncDefaultLocationInboxEmail,
} from "@/lib/default-location";
import { PUT } from "./route";

const mockedRequireAuthContext = vi.mocked(requireAuthContext);
const mockedAssertRole = vi.mocked(assertRole);
const mockedGetDefaultLocationForOrg = vi.mocked(getDefaultLocationForOrg);
const mockedSyncDefaultLocationInboxEmail = vi.mocked(syncDefaultLocationInboxEmail);

function createEmailAccountBuilder(params: {
  lastVerificationStatus: string;
  consecutiveFailures?: number;
  lastError?: string | null;
}) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.update = vi.fn(() => builder);
  builder.maybeSingle = vi
    .fn()
    .mockResolvedValueOnce({
      data: {
        id: "acct-1",
        email_address: "billing@example.com",
        provider: "google",
        subject_filter: "Invoice Upload",
        location_id: "loc-default",
        is_active: false,
        last_verification_status: params.lastVerificationStatus,
        last_error: params.lastError ?? null,
        consecutive_failures: params.consecutiveFailures ?? 0,
      },
      error: null,
    })
    .mockResolvedValueOnce({
      data: {
        id: "acct-1",
        org_id: "org-1",
        location_id: "loc-default",
        provider: "google",
        email_address: "billing@example.com",
        token_expires_at: null,
        subject_filter: "Invoice Upload",
        is_active: true,
        last_polled_at: null,
        last_error: null,
        consecutive_failures: 0,
        created_at: "2026-03-10T10:00:00Z",
        updated_at: "2026-03-14T08:00:00Z",
      },
      error: null,
    });
  return builder;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedRequireAuthContext.mockResolvedValue({
    context: {
      orgId: "org-1",
      appUserId: "user-1",
      clerkUserId: "clerk-user-1",
      role: "admin",
      locationId: "loc-default",
      supabase: {} as never,
    },
    error: null,
  });
  mockedAssertRole.mockReturnValue(null);
  mockedGetDefaultLocationForOrg.mockResolvedValue({
    id: "loc-default",
    org_id: "org-1",
    name: "Main",
    is_default: true,
  } as never);
});

describe("PUT /api/settings/email-accounts/[id]", () => {
  it("blocks activation when verification has not succeeded", async () => {
    const emailAccounts = createEmailAccountBuilder({
      lastVerificationStatus: "failed",
    });

    mockedRequireAuthContext.mockResolvedValue({
      context: {
        orgId: "org-1",
        role: "admin",
        supabase: {
          from: vi.fn((table: string) => {
            if (table === "email_accounts") return emailAccounts;
            throw new Error(`Unexpected table ${table}`);
          }),
        },
      } as never,
      error: null,
    });

    const response = await PUT(
      new Request("http://localhost", {
        method: "PUT",
        body: JSON.stringify({ is_active: true }),
      }) as never,
      { params: Promise.resolve({ id: "acct-1" }) }
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.message).toContain("not verified");
  });

  it("allows activation after verification succeeds", async () => {
    const emailAccounts = createEmailAccountBuilder({
      lastVerificationStatus: "verified",
      consecutiveFailures: 5,
      lastError: "Disabled after repeated worker failures",
    });

    mockedRequireAuthContext.mockResolvedValue({
      context: {
        orgId: "org-1",
        role: "admin",
        supabase: {
          from: vi.fn((table: string) => {
            if (table === "email_accounts") return emailAccounts;
            throw new Error(`Unexpected table ${table}`);
          }),
        },
      } as never,
      error: null,
    });

    const response = await PUT(
      new Request("http://localhost", {
        method: "PUT",
        body: JSON.stringify({ is_active: true }),
      }) as never,
      { params: Promise.resolve({ id: "acct-1" }) }
    );

    expect(response.status).toBe(200);
    expect(emailAccounts.update).toHaveBeenCalledWith(
      expect.objectContaining({
        is_active: true,
        consecutive_failures: 0,
        last_error: null,
      })
    );
    expect(mockedSyncDefaultLocationInboxEmail).toHaveBeenCalledWith(
      expect.anything(),
      "loc-default",
      "billing@example.com"
    );
  });
});
