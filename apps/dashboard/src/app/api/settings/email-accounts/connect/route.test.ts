import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/authz", () => ({
  requireAuthContext: vi.fn(),
  assertRole: vi.fn(),
}));

vi.mock("@/lib/default-location", () => ({
  getDefaultLocationForOrg: vi.fn(),
}));

import { assertRole, requireAuthContext } from "@/lib/authz";
import { getDefaultLocationForOrg } from "@/lib/default-location";
import { parseEmailOAuthState } from "@/lib/email-providers";
import { POST } from "./route";

const mockedRequireAuthContext = vi.mocked(requireAuthContext);
const mockedAssertRole = vi.mocked(assertRole);
const mockedGetDefaultLocationForOrg = vi.mocked(getDefaultLocationForOrg);

function createEmailAccountsBuilder(result: { data: unknown; error: unknown }) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.order = vi.fn(() => builder);
  builder.limit = vi.fn(() => builder);
  builder.maybeSingle = vi.fn(async () => result);
  return builder;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedAssertRole.mockReturnValue(null);
  process.env.GOOGLE_OAUTH_CLIENT_ID = "google-client-id";
  process.env.GOOGLE_OAUTH_CLIENT_SECRET = "google-client-secret";
  process.env.MICROSOFT_OAUTH_CLIENT_ID = "microsoft-client-id";
  process.env.MICROSOFT_OAUTH_CLIENT_SECRET = "microsoft-client-secret";
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  process.env.EMAIL_OAUTH_STATE_SIGNING_KEY = "aa".repeat(32);
  mockedGetDefaultLocationForOrg.mockResolvedValue({
    id: "loc-default",
    org_id: "org-1",
    name: "Main",
    is_default: true,
  } as never);
});

describe("POST /api/settings/email-accounts/connect", () => {
  it("returns a conflict when an active inbox already exists", async () => {
    mockedRequireAuthContext.mockResolvedValue({
      context: {
        orgId: "org-1",
        appUserId: "user-1",
        supabase: {
          from: vi.fn((table: string) => {
            if (table === "email_accounts") {
              return createEmailAccountsBuilder({
                data: { id: "acct-1", email_address: "billing@example.com" },
                error: null,
              });
            }
            throw new Error(`Unexpected table ${table}`);
          }),
        },
      } as never,
      error: null,
    });

    const response = await POST(
      new Request(
        "http://localhost/api/settings/email-accounts/connect?provider=google"
      ) as never
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        error: expect.objectContaining({
          code: "ACTIVE_INBOX_EXISTS",
        }),
      })
    );
  });

  it("returns a conflict when a paused inbox already exists", async () => {
    mockedRequireAuthContext.mockResolvedValue({
      context: {
        orgId: "org-1",
        appUserId: "user-1",
        supabase: {
          from: vi.fn((table: string) => {
            if (table === "email_accounts") {
              return createEmailAccountsBuilder({
                data: {
                  id: "acct-1",
                  email_address: "billing@example.com",
                  is_active: false,
                },
                error: null,
              });
            }
            throw new Error(`Unexpected table ${table}`);
          }),
        },
      } as never,
      error: null,
    });

    const response = await POST(
      new Request(
        "http://localhost/api/settings/email-accounts/connect?provider=google"
      ) as never
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        error: expect.objectContaining({
          code: "ACTIVE_INBOX_EXISTS",
          message: expect.stringContaining("billing@example.com"),
        }),
      })
    );
  });

  it("binds the OAuth state to the default location", async () => {
    mockedRequireAuthContext.mockResolvedValue({
      context: {
        orgId: "org-1",
        appUserId: "user-1",
        clerkUserId: "clerk-user-1",
        supabase: {
          from: vi.fn((table: string) => {
            if (table === "email_accounts") {
              return createEmailAccountsBuilder({
                data: null,
                error: null,
              });
            }
            throw new Error(`Unexpected table ${table}`);
          }),
        },
      } as never,
      error: null,
    });

    const response = await POST(
      new Request(
        "http://localhost/api/settings/email-accounts/connect?provider=google"
      ) as never
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    const authUrl = new URL(body.authorization_url as string);
    const state = parseEmailOAuthState(authUrl.searchParams.get("state"));

    expect(state?.location_id).toBe("loc-default");
  });

  it("returns a Microsoft authorization URL when requested", async () => {
    mockedRequireAuthContext.mockResolvedValue({
      context: {
        orgId: "org-1",
        appUserId: "user-1",
        clerkUserId: "clerk-user-1",
        supabase: {
          from: vi.fn((table: string) => {
            if (table === "email_accounts") {
              return createEmailAccountsBuilder({
                data: null,
                error: null,
              });
            }
            throw new Error(`Unexpected table ${table}`);
          }),
        },
      } as never,
      error: null,
    });

    const response = await POST(
      new Request(
        "http://localhost/api/settings/email-accounts/connect?provider=microsoft"
      ) as never
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.authorization_url).toContain("login.microsoftonline.com");
  });

  it("returns a structured server config error when OAuth state signing is unavailable", async () => {
    delete process.env.EMAIL_OAUTH_STATE_SIGNING_KEY;
    delete process.env.EMAIL_TOKEN_ENCRYPTION_KEY;

    mockedRequireAuthContext.mockResolvedValue({
      context: {
        orgId: "org-1",
        appUserId: "user-1",
        clerkUserId: "clerk-user-1",
        supabase: {
          from: vi.fn((table: string) => {
            if (table === "email_accounts") {
              return createEmailAccountsBuilder({
                data: null,
                error: null,
              });
            }
            throw new Error(`Unexpected table ${table}`);
          }),
        },
      } as never,
      error: null,
    });

    const response = await POST(
      new Request(
        "http://localhost/api/settings/email-accounts/connect?provider=google"
      ) as never
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        error: expect.objectContaining({
          message: expect.stringContaining("EMAIL_OAUTH_STATE_SIGNING_KEY"),
        }),
      })
    );
  });
});
