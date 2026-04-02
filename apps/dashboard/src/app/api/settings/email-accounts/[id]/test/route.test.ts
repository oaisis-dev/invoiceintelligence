import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/authz", () => ({
  requireAuthContext: vi.fn(),
  assertRole: vi.fn(),
}));

vi.mock("@/lib/crypto", () => ({
  decryptToken: vi.fn((value: string) => value.replace("encrypted:", "")),
  encryptToken: vi.fn((value: string) => `encrypted:${value}`),
}));

vi.mock("@/lib/email-providers", () => ({
  shouldRefreshAccessToken: vi.fn(),
  refreshAccessToken: vi.fn(),
  fetchMailboxIdentity: vi.fn(),
  verifyMailboxAccess: vi.fn(),
}));

vi.mock("@/lib/default-location", () => ({
  getDefaultLocationForOrg: vi.fn(),
  syncDefaultLocationInboxEmail: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

import { assertRole, requireAuthContext } from "@/lib/authz";
import {
  fetchMailboxIdentity,
  refreshAccessToken,
  shouldRefreshAccessToken,
  verifyMailboxAccess,
} from "@/lib/email-providers";
import {
  getDefaultLocationForOrg,
  syncDefaultLocationInboxEmail,
} from "@/lib/default-location";
import { createAdminClient } from "@/lib/supabase/admin";
import { POST } from "./route";

const mockedRequireAuthContext = vi.mocked(requireAuthContext);
const mockedAssertRole = vi.mocked(assertRole);
const mockedCreateAdminClient = vi.mocked(createAdminClient);
const mockedShouldRefreshAccessToken = vi.mocked(shouldRefreshAccessToken);
const mockedRefreshAccessToken = vi.mocked(refreshAccessToken);
const mockedFetchMailboxIdentity = vi.mocked(fetchMailboxIdentity);
const mockedVerifyMailboxAccess = vi.mocked(verifyMailboxAccess);
const mockedGetDefaultLocationForOrg = vi.mocked(getDefaultLocationForOrg);
const mockedSyncDefaultLocationInboxEmail = vi.mocked(syncDefaultLocationInboxEmail);

function createEmailAccountBuilder() {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.maybeSingle = vi.fn(async () => ({
    data: {
      id: "acct-1",
      org_id: "org-1",
      location_id: "loc-default",
      provider: "google",
      email_address: "billing@example.com",
      access_token_encrypted: "encrypted:access",
      refresh_token_encrypted: "encrypted:refresh",
      token_expires_at: "2026-03-14T07:00:00Z",
      is_active: true,
      last_verification_status: "verified",
      last_error: null,
      consecutive_failures: 0,
      provider_account_id: "google-user-1",
      provider_metadata: {},
    },
    error: null,
  }));
  builder.update = vi.fn(() => builder);
  builder.single = vi.fn(async () => ({
    data: {
      id: "acct-1",
      org_id: "org-1",
      location_id: "loc-default",
      provider: "google",
      email_address: "billing@example.com",
      token_expires_at: "2026-03-14T08:00:00Z",
      subject_filter: "Invoice Upload",
      is_active: true,
      last_polled_at: null,
      last_verified_at: "2026-03-14T08:00:00Z",
      last_verification_status: "verified",
      last_verification_error: null,
      last_error: null,
      consecutive_failures: 0,
      disconnected_at: null,
      created_at: "2026-03-10T10:00:00Z",
      updated_at: "2026-03-14T08:00:00Z",
      location: {
        id: "loc-default",
        name: "Main",
        is_default: true,
      },
    },
    error: null,
  }));
  return builder;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.EMAIL_TOKEN_ENCRYPTION_KEY = "ab".repeat(32);

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
  mockedShouldRefreshAccessToken.mockReturnValue(false);
  mockedFetchMailboxIdentity.mockResolvedValue({
    emailAddress: "billing@example.com",
    providerAccountId: "google-user-1",
    metadata: {},
  });
  mockedVerifyMailboxAccess.mockResolvedValue({
    status: "verified",
    message: "Mailbox access verified successfully.",
    verifiedAt: "2026-03-14T08:00:00Z",
  });
  mockedGetDefaultLocationForOrg.mockResolvedValue({
    id: "loc-default",
    org_id: "org-1",
    name: "Main",
    is_default: true,
  } as never);
  mockedSyncDefaultLocationInboxEmail.mockResolvedValue(undefined as never);
});

describe("POST /api/settings/email-accounts/[id]/test", () => {
  it("verifies the inbox and updates verification metadata", async () => {
    const emailAccounts = createEmailAccountBuilder();

    mockedCreateAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "email_accounts") return emailAccounts;
        throw new Error(`Unexpected table ${table}`);
      }),
    } as never);

    const response = await POST(new Request("http://localhost") as never, {
      params: Promise.resolve({ id: "acct-1" }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.verification.status).toBe("verified");
    expect(emailAccounts.update).toHaveBeenCalledWith(
      expect.objectContaining({
        last_verification_status: "verified",
        last_verification_error: null,
      })
    );
  });

  it("refreshes expired tokens before verification", async () => {
    const emailAccounts = createEmailAccountBuilder();
    mockedCreateAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "email_accounts") return emailAccounts;
        throw new Error(`Unexpected table ${table}`);
      }),
    } as never);
    mockedShouldRefreshAccessToken.mockReturnValue(true);
    mockedRefreshAccessToken.mockResolvedValue({
      accessToken: "new-access",
      refreshToken: "new-refresh",
      expiresIn: 3600,
      tokenType: "Bearer",
      scope: null,
      idToken: null,
    });

    const response = await POST(new Request("http://localhost") as never, {
      params: Promise.resolve({ id: "acct-1" }),
    });

    expect(response.status).toBe(200);
    expect(mockedRefreshAccessToken).toHaveBeenCalledWith("google", "refresh");
  });

  it("stores a failed verification result without returning a server error", async () => {
    const emailAccounts = createEmailAccountBuilder();
    mockedCreateAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "email_accounts") return emailAccounts;
        throw new Error(`Unexpected table ${table}`);
      }),
    } as never);
    mockedVerifyMailboxAccess.mockRejectedValue(new Error("Mailbox access denied"));

    const response = await POST(new Request("http://localhost") as never, {
      params: Promise.resolve({ id: "acct-1" }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.verification.status).toBe("failed");
    expect(body.verification.message).toContain("Mailbox access denied");
    expect(emailAccounts.update).toHaveBeenCalledWith(
      expect.objectContaining({
        last_verification_status: "failed",
        last_verification_error: "Mailbox access denied",
      })
    );
  });

  it("reactivates a previously failed inbox after a successful test", async () => {
    const emailAccounts = createEmailAccountBuilder();
    emailAccounts.maybeSingle = vi.fn(async () => ({
      data: {
        id: "acct-1",
        org_id: "org-1",
        location_id: "loc-default",
        provider: "google",
        email_address: "billing@example.com",
        access_token_encrypted: "encrypted:access",
        refresh_token_encrypted: "encrypted:refresh",
        token_expires_at: "2026-03-14T07:00:00Z",
        is_active: false,
        last_verification_status: "failed",
        last_error: "Disabled after repeated worker failures",
        consecutive_failures: 5,
        provider_account_id: "google-user-1",
        provider_metadata: {},
      },
      error: null,
    }));

    mockedCreateAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "email_accounts") return emailAccounts;
        throw new Error(`Unexpected table ${table}`);
      }),
    } as never);

    const response = await POST(new Request("http://localhost") as never, {
      params: Promise.resolve({ id: "acct-1" }),
    });

    expect(response.status).toBe(200);
    expect(emailAccounts.update).toHaveBeenCalledWith(
      expect.objectContaining({
        is_active: true,
        last_verification_status: "verified",
        consecutive_failures: 0,
        last_error: null,
      })
    );
  });
});
