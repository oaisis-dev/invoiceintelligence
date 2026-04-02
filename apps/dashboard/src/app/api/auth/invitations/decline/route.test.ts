import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
  clerkClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/organization-members", () => ({
  declineInvitation: vi.fn(),
}));

import { auth, clerkClient } from "@clerk/nextjs/server";
import { declineInvitation } from "@/lib/organization-members";
import { createAdminClient } from "@/lib/supabase/admin";
import { POST } from "./route";

const mockedAuth = vi.mocked(auth);
const mockedClerkClient = vi.mocked(clerkClient);
const mockedCreateAdminClient = vi.mocked(createAdminClient);
const mockedDeclineInvitation = vi.mocked(declineInvitation);

beforeEach(() => {
  vi.clearAllMocks();
  mockedAuth.mockResolvedValue({ userId: "clerk-user-1" } as never);
  mockedCreateAdminClient.mockReturnValue({} as never);
  mockedClerkClient.mockResolvedValue({
    users: {
      getUser: vi.fn(async () => ({
        emailAddresses: [{ emailAddress: "sachin@example.com" }],
      })),
    },
  } as never);
});

describe("POST /api/auth/invitations/decline", () => {
  it("declines an invitation for the signed-in email", async () => {
    mockedDeclineInvitation.mockResolvedValue({
      id: "invite-1",
      org_id: "org-1",
      email: "sachin@example.com",
      role: "manager",
    } as never);

    const response = await POST(
      new Request("http://localhost/api/auth/invitations/decline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId: "invite-1" }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        invitation: expect.objectContaining({ id: "invite-1" }),
      })
    );
  });

  it("returns not found when the invite is already gone", async () => {
    mockedDeclineInvitation.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/auth/invitations/decline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId: "invite-1" }),
      })
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        error: expect.objectContaining({
          code: "INVITATION_NOT_FOUND",
        }),
      })
    );
  });
});
