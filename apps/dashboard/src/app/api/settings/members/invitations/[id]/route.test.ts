import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/authz", () => ({
  requireAuthContext: vi.fn(),
  assertRole: vi.fn(() => null),
}));

vi.mock("@/lib/organization-members", () => ({
  createOrRefreshInvitation: vi.fn(),
  revokeInvitation: vi.fn(),
}));

import { requireAuthContext } from "@/lib/authz";
import {
  createOrRefreshInvitation,
  revokeInvitation,
} from "@/lib/organization-members";
import { PATCH } from "./route";

const mockedRequireAuthContext = vi.mocked(requireAuthContext);
const mockedCreateOrRefreshInvitation = vi.mocked(createOrRefreshInvitation);
const mockedRevokeInvitation = vi.mocked(revokeInvitation);

beforeEach(() => {
  vi.clearAllMocks();
  mockedRequireAuthContext.mockResolvedValue({
    context: {
      orgId: "org-1",
      appUserId: "user-1",
      supabase: {
        from: vi.fn(() => {
          const builder: Record<string, ReturnType<typeof vi.fn>> = {};
          builder.select = vi.fn(() => builder);
          builder.eq = vi.fn(() => builder);
          builder.maybeSingle = vi.fn(async () => ({
            data: { email: "manager@example.com", role: "manager" },
            error: null,
          }));
          return builder;
        }),
      },
    } as never,
    error: null,
  });
});

describe("PATCH /api/settings/members/invitations/[id]", () => {
  it("revokes an invitation", async () => {
    mockedRevokeInvitation.mockResolvedValue({
      id: "invite-1",
      email: "manager@example.com",
      role: "manager",
    } as never);

    const response = await PATCH(
      new Request("http://localhost/api/settings/members/invitations/invite-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke" }),
      }) as never,
      { params: Promise.resolve({ id: "invite-1" }) }
    );

    expect(response.status).toBe(200);
  });

  it("refreshes an invitation link", async () => {
    mockedCreateOrRefreshInvitation.mockResolvedValue({
      invitation: {
        id: "invite-1",
        email: "manager@example.com",
        role: "manager",
        invite_url: "http://localhost:3000/getting-started?invite=abc",
      },
    } as never);

    const response = await PATCH(
      new Request("http://localhost/api/settings/members/invitations/invite-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resend" }),
      }) as never,
      { params: Promise.resolve({ id: "invite-1" }) }
    );

    expect(response.status).toBe(200);
  });
});
