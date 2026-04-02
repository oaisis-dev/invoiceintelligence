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
  getIdentityColumnFromEnv: vi.fn(),
}));

vi.mock("@/lib/organization-members", () => ({
  claimInvitation: vi.fn(),
}));

import { auth, clerkClient } from "@clerk/nextjs/server";
import { claimInvitation } from "@/lib/organization-members";
import { buildDisplayName, getIdentityColumnFromEnv } from "@/lib/provisioning";
import { createAdminClient } from "@/lib/supabase/admin";
import { POST } from "./route";

const mockedAuth = vi.mocked(auth);
const mockedClerkClient = vi.mocked(clerkClient);
const mockedCreateAdminClient = vi.mocked(createAdminClient);
const mockedBuildDisplayName = vi.mocked(buildDisplayName);
const mockedGetIdentityColumnFromEnv = vi.mocked(getIdentityColumnFromEnv);
const mockedClaimInvitation = vi.mocked(claimInvitation);

beforeEach(() => {
  vi.clearAllMocks();
  mockedAuth.mockResolvedValue({ userId: "clerk-user-1" } as never);
  mockedBuildDisplayName.mockReturnValue("Sachin");
  mockedGetIdentityColumnFromEnv.mockReturnValue("clerk_dev_id");
  mockedCreateAdminClient.mockReturnValue({} as never);
  mockedClerkClient.mockResolvedValue({
    users: {
      getUser: vi.fn(async () => ({
        emailAddresses: [{ emailAddress: "sachin@example.com" }],
        firstName: "Sachin",
        lastName: "M",
      })),
      updateUserMetadata: vi.fn(async () => ({})),
    },
  } as never);
});

describe("POST /api/auth/invitations/claim", () => {
  it("claims an invitation and updates Clerk metadata", async () => {
    const updateUserMetadata = vi.fn(async () => ({}));
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
    mockedClaimInvitation.mockResolvedValue({
      invitationId: "invite-1",
      orgId: "org-1",
      role: "manager",
      memberId: "user-2",
    });

    const response = await POST(
      new Request("http://localhost/api/auth/invitations/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId: "invite-1" }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      provisioned: true,
      orgId: "org-1",
      role: "manager",
    });
    expect(updateUserMetadata).toHaveBeenCalledWith("clerk-user-1", {
      publicMetadata: { org_id: "org-1" },
    });
  });

  it("returns a conflict when the account is already provisioned", async () => {
    mockedClaimInvitation.mockRejectedValue(
      new Error("This Clerk account is already provisioned for a workspace.")
    );

    const response = await POST(
      new Request("http://localhost/api/auth/invitations/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId: "invite-1" }),
      })
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        error: expect.objectContaining({
          code: "ACCOUNT_ALREADY_PROVISIONED",
        }),
      })
    );
  });
});
