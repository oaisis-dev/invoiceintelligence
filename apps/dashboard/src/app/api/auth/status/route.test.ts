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
  buildSuggestedWorkspaceName: vi.fn(),
  getIdentityColumnFromEnv: vi.fn(),
  linkExistingUserIdentity: vi.fn(),
}));

vi.mock("@/lib/organization-members", () => ({
  getPendingInvitationForToken: vi.fn(),
  listPendingInvitationsForEmail: vi.fn(),
}));

import { auth, clerkClient } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildDisplayName,
  buildSuggestedWorkspaceName,
  getIdentityColumnFromEnv,
  linkExistingUserIdentity,
} from "@/lib/provisioning";
import {
  getPendingInvitationForToken,
  listPendingInvitationsForEmail,
} from "@/lib/organization-members";
import { GET } from "./route";

const mockedAuth = vi.mocked(auth);
const mockedClerkClient = vi.mocked(clerkClient);
const mockedCreateAdminClient = vi.mocked(createAdminClient);
const mockedBuildDisplayName = vi.mocked(buildDisplayName);
const mockedBuildSuggestedWorkspaceName = vi.mocked(buildSuggestedWorkspaceName);
const mockedGetIdentityColumnFromEnv = vi.mocked(getIdentityColumnFromEnv);
const mockedLinkExistingUserIdentity = vi.mocked(linkExistingUserIdentity);
const mockedGetPendingInvitationForToken = vi.mocked(getPendingInvitationForToken);
const mockedListPendingInvitationsForEmail = vi.mocked(listPendingInvitationsForEmail);

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
  mockedListPendingInvitationsForEmail.mockResolvedValue([]);
  mockedGetPendingInvitationForToken.mockResolvedValue(null);
});

describe("GET /api/auth/status", () => {
  it("returns provisioned status for an active app user", async () => {
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

    const response = await GET(new Request("http://localhost/api/auth/status") as never);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      provisioned: true,
      orgId: "org-1",
      role: "admin",
    });
    expect(updateUserMetadata).toHaveBeenCalledWith("clerk-user-1", {
      publicMetadata: { org_id: "org-1" },
    });
  });

  it("returns onboarding suggestions for an unprovisioned user", async () => {
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
        updateUserMetadata: vi.fn(async () => ({})),
      },
    } as never);
    mockedLinkExistingUserIdentity.mockResolvedValue(null);
    mockedBuildSuggestedWorkspaceName
      .mockReturnValueOnce("Sachin's Workspace")
      .mockReturnValueOnce("Example");

    const response = await GET(new Request("http://localhost/api/auth/status") as never);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      provisioned: false,
      email: "sachin@example.com",
      displayName: "Sachin",
      suggestedIndividualWorkspaceName: "Sachin's Workspace",
      suggestedOrganizationWorkspaceName: "Example",
      pendingInvitations: [],
      highlightedInvitationId: null,
      inviteLookupError: null,
    });
    expect(mockedLinkExistingUserIdentity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        email: "sachin@example.com",
        clerkUserId: "clerk-user-1",
        identityColumn: "clerk_dev_id",
      })
    );
  });

  it("returns pending invitations when the signed-in email has invites", async () => {
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
        updateUserMetadata: vi.fn(async () => ({})),
      },
    } as never);
    mockedLinkExistingUserIdentity.mockResolvedValue(null);
    mockedBuildSuggestedWorkspaceName
      .mockReturnValueOnce("Sachin's Workspace")
      .mockReturnValueOnce("Example");
    mockedListPendingInvitationsForEmail.mockResolvedValue([
      {
        id: "invite-1",
        org_id: "org-2",
        organization_name: "Acme Ops",
        organization_slug: "acme-ops",
        workspace_type: "organization",
        email: "sachin@example.com",
        role: "manager",
        expires_at: "2026-03-20T00:00:00Z",
        invited_by_label: "Owner",
      },
    ] as never);
    mockedGetPendingInvitationForToken.mockResolvedValue({
      id: "invite-1",
    } as never);

    const response = await GET(
      new Request("http://localhost/api/auth/status?invite=abc123") as never
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        provisioned: false,
        pendingInvitations: [
          expect.objectContaining({
            id: "invite-1",
            organization_name: "Acme Ops",
          }),
        ],
        highlightedInvitationId: "invite-1",
        inviteLookupError: null,
      })
    );
  });
});
