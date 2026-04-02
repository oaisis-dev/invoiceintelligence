import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
  clerkClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/provisioning", () => ({
  buildDisplayName: vi.fn(),
  configureProvisionedWorkspace: vi.fn(),
  getIdentityColumnFromEnv: vi.fn(),
  linkExistingUserIdentity: vi.fn(),
  normalizeWorkspaceName: vi.fn((value: string) => value.trim()),
  provisionNewAccount: vi.fn(),
}));

vi.mock("@/lib/organization-members", () => ({
  listPendingInvitationsForEmail: vi.fn(),
}));

vi.mock("@/lib/billing/config", () => ({
  getPlanById: vi.fn(),
  getBillingService: vi.fn(),
}));

import { auth, clerkClient } from "@clerk/nextjs/server";
import { listPendingInvitationsForEmail } from "@/lib/organization-members";
import {
  buildDisplayName,
  configureProvisionedWorkspace,
  getIdentityColumnFromEnv,
  linkExistingUserIdentity,
  provisionNewAccount,
} from "@/lib/provisioning";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlanById, getBillingService } from "@/lib/billing/config";
import { POST } from "./route";

const mockedAuth = vi.mocked(auth);
const mockedClerkClient = vi.mocked(clerkClient);
const mockedCreateAdminClient = vi.mocked(createAdminClient);
const mockedBuildDisplayName = vi.mocked(buildDisplayName);
const mockedConfigureProvisionedWorkspace = vi.mocked(configureProvisionedWorkspace);
const mockedGetIdentityColumnFromEnv = vi.mocked(getIdentityColumnFromEnv);
const mockedLinkExistingUserIdentity = vi.mocked(linkExistingUserIdentity);
const mockedProvisionNewAccount = vi.mocked(provisionNewAccount);
const mockedListPendingInvitationsForEmail = vi.mocked(listPendingInvitationsForEmail);
const mockedGetPlanById = vi.mocked(getPlanById);
const mockedGetBillingService = vi.mocked(getBillingService);

function createUsersLookupBuilder(result: { data: unknown; error: unknown }) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  builder.select = vi.fn(() => builder);
  builder.or = vi.fn(() => builder);
  builder.maybeSingle = vi.fn(async () => result);
  return builder;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedAuth.mockResolvedValue({ userId: "clerk-user-1" } as never);
  mockedGetIdentityColumnFromEnv.mockReturnValue("clerk_dev_id");
  mockedBuildDisplayName.mockReturnValue("Sachin");
  mockedConfigureProvisionedWorkspace.mockResolvedValue({
    name: "Sachin's Workspace",
    slug: "sachins-workspace",
  });
  mockedProvisionNewAccount.mockResolvedValue({
    orgId: "org-1",
    locationId: "loc-1",
    userId: "user-1",
    error: null,
  });
  mockedListPendingInvitationsForEmail.mockResolvedValue([]);
  mockedGetPlanById.mockResolvedValue(null);
});

describe("POST /api/auth/onboarding", () => {
  it("creates a self-serve workspace for an unprovisioned user", async () => {
    const updateUserMetadata = vi.fn(async () => ({}));

    mockedCreateAdminClient.mockReturnValue({
      from: vi.fn(() =>
        createUsersLookupBuilder({
          data: null,
          error: null,
        })
      ),
    } as never);
    mockedClerkClient.mockResolvedValue({
      users: {
        getUser: vi.fn(async () => ({
          emailAddresses: [{ emailAddress: "sachin@example.com" }],
          firstName: "Sachin",
          lastName: "M",
        })),
        updateUserMetadata,
      },
    } as never);
    mockedLinkExistingUserIdentity.mockResolvedValue(null);

    const request = new Request("http://localhost/api/auth/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceType: "individual",
        workspaceName: "Sachin's Workspace",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      provisioned: true,
      orgId: "org-1",
      role: "admin",
    });
    expect(mockedProvisionNewAccount).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        email: "sachin@example.com",
        displayName: "Sachin",
      })
    );
    expect(mockedConfigureProvisionedWorkspace).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        orgId: "org-1",
        workspaceName: "Sachin's Workspace",
        workspaceType: "individual",
      })
    );
    expect(updateUserMetadata).toHaveBeenCalledWith("clerk-user-1", {
      publicMetadata: { org_id: "org-1" },
    });
  });

  it("returns the existing workspace when the user is already provisioned", async () => {
    const updateUserMetadata = vi.fn(async () => ({}));

    mockedCreateAdminClient.mockReturnValue({
      from: vi.fn(() =>
        createUsersLookupBuilder({
          data: { id: "user-1", org_id: "org-1", role: "admin", is_active: true },
          error: null,
        })
      ),
    } as never);
    mockedClerkClient.mockResolvedValue({
      users: {
        updateUserMetadata,
      },
    } as never);

    const request = new Request("http://localhost/api/auth/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceType: "organization",
        workspaceName: "Example",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      provisioned: true,
      orgId: "org-1",
      role: "admin",
    });
    expect(mockedProvisionNewAccount).not.toHaveBeenCalled();
    expect(mockedConfigureProvisionedWorkspace).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        orgId: "org-1",
        workspaceName: "Example",
        workspaceType: "organization",
      })
    );
    expect(updateUserMetadata).toHaveBeenCalledWith("clerk-user-1", {
      publicMetadata: { org_id: "org-1" },
    });
  });

  it("completes onboarding for a linked existing workspace", async () => {
    const updateUserMetadata = vi.fn(async () => ({}));

    mockedCreateAdminClient.mockReturnValue({
      from: vi.fn(() =>
        createUsersLookupBuilder({
          data: null,
          error: null,
        })
      ),
    } as never);
    mockedClerkClient.mockResolvedValue({
      users: {
        getUser: vi.fn(async () => ({
          emailAddresses: [{ emailAddress: "sachin@example.com" }],
          firstName: "Sachin",
          lastName: "M",
        })),
        updateUserMetadata,
      },
    } as never);
    mockedLinkExistingUserIdentity.mockResolvedValue({
      orgId: "org-1",
      role: "manager",
      userId: "user-2",
    } as never);

    const request = new Request("http://localhost/api/auth/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceType: "individual",
        workspaceName: "Sachin's Workspace",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      provisioned: true,
      orgId: "org-1",
      role: "manager",
    });
    expect(updateUserMetadata).toHaveBeenCalledWith("clerk-user-1", {
      publicMetadata: { org_id: "org-1" },
    });
    expect(mockedProvisionNewAccount).not.toHaveBeenCalled();
  });

  it("rejects an empty workspace name", async () => {
    const request = new Request("http://localhost/api/auth/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceType: "individual",
        workspaceName: " ",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        error: expect.objectContaining({
          code: "INVALID_ONBOARDING_PAYLOAD",
        }),
      })
    );
  });

  it("blocks self-serve onboarding when a pending invite exists", async () => {
    mockedCreateAdminClient.mockReturnValue({
      from: vi.fn(() =>
        createUsersLookupBuilder({
          data: null,
          error: null,
        })
      ),
    } as never);
    mockedClerkClient.mockResolvedValue({
      users: {
        getUser: vi.fn(async () => ({
          emailAddresses: [{ emailAddress: "sachin@example.com" }],
          firstName: "Sachin",
          lastName: "M",
        })),
      },
    } as never);
    mockedLinkExistingUserIdentity.mockResolvedValue(null);
    mockedListPendingInvitationsForEmail.mockResolvedValue([
      { id: "invite-1" },
    ] as never);

    const request = new Request("http://localhost/api/auth/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceType: "individual",
        workspaceName: "Sachin's Workspace",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        error: expect.objectContaining({
          code: "INVITE_PENDING_JOIN_REQUIRED",
        }),
      })
    );
    expect(mockedProvisionNewAccount).not.toHaveBeenCalled();
  });

  it("passes free planId to configureProvisionedWorkspace", async () => {
    const updateUserMetadata = vi.fn(async () => ({}));

    mockedCreateAdminClient.mockReturnValue({
      from: vi.fn(() =>
        createUsersLookupBuilder({
          data: null,
          error: null,
        })
      ),
    } as never);
    mockedClerkClient.mockResolvedValue({
      users: {
        getUser: vi.fn(async () => ({
          emailAddresses: [{ emailAddress: "sachin@example.com" }],
          firstName: "Sachin",
          lastName: "M",
        })),
        updateUserMetadata,
      },
    } as never);
    mockedLinkExistingUserIdentity.mockResolvedValue(null);
    mockedGetPlanById.mockResolvedValue({
      id: "plan-free-ind",
      workspace_type: "individual",
      tier: "free",
      display_name: "Free",
      monthly_invoice_limit: 10,
      max_users: 1,
      price_cents: 0,
      payment_price_id: null,
      features: [],
      is_active: true,
      sort_order: 1,
      created_at: "",
      updated_at: "",
    });

    const request = new Request("http://localhost/api/auth/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceType: "individual",
        workspaceName: "Sachin's Workspace",
        planId: "plan-free-ind",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      provisioned: true,
      orgId: "org-1",
      role: "admin",
    });
    expect(mockedConfigureProvisionedWorkspace).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        planId: "plan-free-ind",
      })
    );
  });

  it("returns checkoutUrl for paid plan", async () => {
    const updateUserMetadata = vi.fn(async () => ({}));
    const mockCreateCheckout = vi.fn(async () => ({ url: "https://checkout.stripe.com/session-123" }));

    mockedCreateAdminClient.mockReturnValue({
      from: vi.fn(() =>
        createUsersLookupBuilder({
          data: null,
          error: null,
        })
      ),
    } as never);
    mockedClerkClient.mockResolvedValue({
      users: {
        getUser: vi.fn(async () => ({
          emailAddresses: [{ emailAddress: "sachin@example.com" }],
          firstName: "Sachin",
          lastName: "M",
        })),
        updateUserMetadata,
      },
    } as never);
    mockedLinkExistingUserIdentity.mockResolvedValue(null);
    mockedGetPlanById.mockResolvedValue({
      id: "plan-pro-ind",
      workspace_type: "individual",
      tier: "pro",
      display_name: "Pro",
      monthly_invoice_limit: 100,
      max_users: 1,
      price_cents: 3000,
      payment_price_id: "price_stripe_123",
      features: [],
      is_active: true,
      sort_order: 2,
      created_at: "",
      updated_at: "",
    });
    mockedGetBillingService.mockReturnValue({
      createCheckout: mockCreateCheckout,
    } as never);

    const request = new Request("http://localhost/api/auth/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceType: "individual",
        workspaceName: "Sachin's Workspace",
        planId: "plan-pro-ind",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      provisioned: true,
      orgId: "org-1",
      role: "admin",
      checkoutUrl: "https://checkout.stripe.com/session-123",
    });
    // Paid plan should NOT be passed to configureProvisionedWorkspace (provisions on free first)
    expect(mockedConfigureProvisionedWorkspace).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        planId: undefined,
      })
    );
    expect(mockCreateCheckout).toHaveBeenCalledWith(
      expect.anything(),
      "org-1",
      "price_stripe_123",
      expect.stringContaining("/getting-started?checkout=success"),
      expect.stringContaining("/getting-started?checkout=canceled"),
      { org_id: "org-1", plan_id: "plan-pro-ind" }
    );
  });

  it("returns 400 for enterprise planId", async () => {
    mockedGetPlanById.mockResolvedValue({
      id: "plan-ent-org",
      workspace_type: "organization",
      tier: "enterprise",
      display_name: "Enterprise",
      monthly_invoice_limit: -1,
      max_users: -1,
      price_cents: 0,
      payment_price_id: null,
      features: [],
      is_active: true,
      sort_order: 3,
      created_at: "",
      updated_at: "",
    });

    const request = new Request("http://localhost/api/auth/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceType: "organization",
        workspaceName: "Acme Corp",
        planId: "plan-ent-org",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.message).toContain("Enterprise");
  });

  it("falls back to free plan for invalid planId", async () => {
    const updateUserMetadata = vi.fn(async () => ({}));

    mockedCreateAdminClient.mockReturnValue({
      from: vi.fn(() =>
        createUsersLookupBuilder({
          data: null,
          error: null,
        })
      ),
    } as never);
    mockedClerkClient.mockResolvedValue({
      users: {
        getUser: vi.fn(async () => ({
          emailAddresses: [{ emailAddress: "sachin@example.com" }],
          firstName: "Sachin",
          lastName: "M",
        })),
        updateUserMetadata,
      },
    } as never);
    mockedLinkExistingUserIdentity.mockResolvedValue(null);
    mockedGetPlanById.mockResolvedValue(null); // invalid plan

    const request = new Request("http://localhost/api/auth/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceType: "individual",
        workspaceName: "Sachin's Workspace",
        planId: "nonexistent-plan",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.provisioned).toBe(true);
    // No checkoutUrl for invalid/fallback plan
    expect(body.checkoutUrl).toBeUndefined();
  });
});
