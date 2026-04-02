import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/authz", () => ({
  requireAuthContext: vi.fn(),
  assertRole: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/crypto", () => ({
  encryptToken: vi.fn((value: string) => `encrypted:${value}`),
}));

vi.mock("@/lib/default-location", () => ({
  getDefaultLocationForOrg: vi.fn(),
  syncDefaultLocationInboxEmail: vi.fn(),
}));

import { assertRole, requireAuthContext } from "@/lib/authz";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getDefaultLocationForOrg,
  syncDefaultLocationInboxEmail,
} from "@/lib/default-location";
import { createEmailOAuthState } from "@/lib/email-providers";
import { GET } from "./route";

const mockedRequireAuthContext = vi.mocked(requireAuthContext);
const mockedAssertRole = vi.mocked(assertRole);
const mockedCreateAdminClient = vi.mocked(createAdminClient);
const mockedGetDefaultLocationForOrg = vi.mocked(getDefaultLocationForOrg);
const mockedSyncDefaultLocationInboxEmail = vi.mocked(syncDefaultLocationInboxEmail);

function createEmailAccountsBuilder(options: {
  activeAccount?: unknown;
  upsertError?: unknown;
}) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.order = vi.fn(() => builder);
  builder.limit = vi.fn(() => builder);
  builder.maybeSingle = vi.fn(async () => ({
    data: options.activeAccount ?? null,
    error: null,
  }));
  builder.upsert = vi.fn(() => builder);
  builder.single = vi.fn(async () => ({
    data: {
      id: "acct-1",
      email_address: "billing@example.com",
      provider: "google",
      last_verification_status: "verified",
      last_verification_error: null,
    },
    error: options.upsertError ?? null,
  }));
  return builder;
}

function createState(
  overrides?: Partial<Parameters<typeof createEmailOAuthState>[0]>
) {
  return createEmailOAuthState({
    org_id: "org-1",
    location_id: "loc-default",
    provider: "google",
    app_user_id: "user-1",
    clerk_user_id: "clerk-user-1",
    ...overrides,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", vi.fn());
  process.env.GOOGLE_OAUTH_CLIENT_ID = "google-client-id";
  process.env.GOOGLE_OAUTH_CLIENT_SECRET = "google-client-secret";
  process.env.MICROSOFT_OAUTH_CLIENT_ID = "microsoft-client-id";
  process.env.MICROSOFT_OAUTH_CLIENT_SECRET = "microsoft-client-secret";
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  process.env.EMAIL_TOKEN_ENCRYPTION_KEY = "ab".repeat(32);
  process.env.EMAIL_OAUTH_STATE_SIGNING_KEY = "aa".repeat(32);

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
  mockedSyncDefaultLocationInboxEmail.mockResolvedValue(undefined as never);
});

describe("GET /api/settings/email-accounts/callback", () => {
  it("redirects with a clear error when another inbox is already active", async () => {
    const emailAccounts = createEmailAccountsBuilder({
      activeAccount: { id: "acct-1", email_address: "billing@example.com" },
    });

    mockedCreateAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "email_accounts") return emailAccounts;
        throw new Error(`Unexpected table ${table}`);
      }),
    } as never);

    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "access",
          refresh_token: "refresh",
          expires_in: 3600,
        }),
      } as never)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ email: "new@example.com", id: "user-1" }),
      } as never);

    const response = await GET(
      new Request(
        `http://localhost/api/settings/email-accounts/callback?code=test-code&state=${createState()}`
      ) as never
    );

    expect(response.status).toBe(307);
    const redirectUrl = response.headers.get("location");
    expect(redirectUrl).toContain("error=active_inbox_exists");
    expect(redirectUrl).toContain("existing_email=billing%40example.com");
  });

  it("redirects with a clear error when another inbox exists but is paused", async () => {
    const emailAccounts = createEmailAccountsBuilder({
      activeAccount: {
        id: "acct-1",
        email_address: "billing@example.com",
        is_active: false,
      },
    });

    mockedCreateAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "email_accounts") return emailAccounts;
        throw new Error(`Unexpected table ${table}`);
      }),
    } as never);

    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "access",
          refresh_token: "refresh",
          expires_in: 3600,
        }),
      } as never)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ email: "new@example.com", id: "user-1" }),
      } as never);

    const response = await GET(
      new Request(
        `http://localhost/api/settings/email-accounts/callback?code=test-code&state=${createState()}`
      ) as never
    );

    expect(response.status).toBe(307);
    const redirectUrl = response.headers.get("location");
    expect(redirectUrl).toContain("error=active_inbox_exists");
    expect(redirectUrl).toContain("existing_email=billing%40example.com");
  });

  it("stores the inbox against the default location and syncs intake_email", async () => {
    const emailAccounts = createEmailAccountsBuilder({
      activeAccount: null,
    });

    mockedCreateAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "email_accounts") return emailAccounts;
        throw new Error(`Unexpected table ${table}`);
      }),
    } as never);

    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "access",
          refresh_token: "refresh",
          expires_in: 3600,
        }),
      } as never)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ email: "billing@example.com", id: "user-1" }),
      } as never)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ emailAddress: "billing@example.com" }),
      } as never)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: [{ id: "msg-1" }] }),
      } as never)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ labelIds: ["INBOX"] }),
      } as never)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "msg-1" }),
      } as never);

    const response = await GET(
      new Request(
        `http://localhost/api/settings/email-accounts/callback?code=test-code&state=${createState({
          location_id: null,
        })}`
      ) as never
    );

    expect(response.status).toBe(307);
    expect(emailAccounts.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        org_id: "org-1",
        location_id: "loc-default",
        email_address: "billing@example.com",
        is_active: true,
      }),
      { onConflict: "org_id,email_address" }
    );
    expect(mockedSyncDefaultLocationInboxEmail).toHaveBeenCalledWith(
      expect.anything(),
      "loc-default",
      "billing@example.com"
    );
  });

  it("saves a failed first verification as inactive and does not publish it as the intake inbox", async () => {
    const emailAccounts = createEmailAccountsBuilder({
      activeAccount: null,
    });
    emailAccounts.single = vi.fn(async () => ({
      data: {
        id: "acct-1",
        email_address: "billing@example.com",
        provider: "google",
        last_verification_status: "failed",
        last_verification_error: "Google mailbox read verification failed (403): denied",
      },
      error: null,
    }));

    mockedCreateAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "email_accounts") return emailAccounts;
        throw new Error(`Unexpected table ${table}`);
      }),
    } as never);

    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "access",
          refresh_token: "refresh",
          expires_in: 3600,
        }),
      } as never)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ email: "billing@example.com", id: "user-1" }),
      } as never)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ emailAddress: "billing@example.com" }),
      } as never)
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => "denied",
      } as never);

    const response = await GET(
      new Request(
        `http://localhost/api/settings/email-accounts/callback?code=test-code&state=${createState()}`
      ) as never
    );

    expect(response.status).toBe(307);
    expect(emailAccounts.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        email_address: "billing@example.com",
        is_active: false,
        last_verification_status: "failed",
      }),
      { onConflict: "org_id,email_address" }
    );
    expect(mockedSyncDefaultLocationInboxEmail).toHaveBeenCalledWith(
      expect.anything(),
      "loc-default",
      null
    );
    expect(response.headers.get("location")).toContain("verification=failed");
  });

  it("rejects the callback when the signed-in session does not match state", async () => {
    mockedRequireAuthContext.mockResolvedValue({
      context: {
        orgId: "org-1",
        appUserId: "user-1",
        clerkUserId: "another-clerk-user",
        role: "admin",
        locationId: "loc-default",
        supabase: {} as never,
      },
      error: null,
    });

    const response = await GET(
      new Request(
        `http://localhost/api/settings/email-accounts/callback?code=test-code&state=${createState()}`
      ) as never
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("error=session_mismatch");
  });

  it("supports Microsoft mailbox connections", async () => {
    const emailAccounts = createEmailAccountsBuilder({
      activeAccount: null,
    });
    emailAccounts.single = vi.fn(async () => ({
      data: {
        id: "acct-1",
        email_address: "billing@example.com",
        provider: "microsoft",
        last_verification_status: "verified",
        last_verification_error: null,
      },
      error: null,
    }));

    mockedCreateAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "email_accounts") return emailAccounts;
        throw new Error(`Unexpected table ${table}`);
      }),
    } as never);

    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "access",
          refresh_token: "refresh",
          expires_in: 3600,
        }),
      } as never)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "graph-user-1",
          mail: "billing@example.com",
          userPrincipalName: "billing@example.com",
          displayName: "Billing",
        }),
      } as never)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ value: [{ id: "msg-1", isRead: false }] }),
      } as never)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: "msg-1", isRead: false }),
      } as never);

    const response = await GET(
      new Request(
        `http://localhost/api/settings/email-accounts/callback?code=test-code&state=${createState({
          provider: "microsoft",
        })}`
      ) as never
    );

    expect(response.status).toBe(307);
    expect(emailAccounts.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "microsoft",
        provider_account_id: "graph-user-1",
      }),
      { onConflict: "org_id,email_address" }
    );
  });
});
