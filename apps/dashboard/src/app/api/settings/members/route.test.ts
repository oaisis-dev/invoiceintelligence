import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/authz", () => ({
  requireAuthContext: vi.fn(),
  assertRole: vi.fn(),
}));

vi.mock("@/lib/organization-members", () => ({
  createOrRefreshInvitation: vi.fn(),
  listOrganizationMembers: vi.fn(),
  listOrganizationPendingInvitations: vi.fn(),
}));

import { assertRole, requireAuthContext } from "@/lib/authz";
import {
  createOrRefreshInvitation,
  listOrganizationMembers,
  listOrganizationPendingInvitations,
} from "@/lib/organization-members";
import { GET, POST } from "./route";

const mockedRequireAuthContext = vi.mocked(requireAuthContext);
const mockedAssertRole = vi.mocked(assertRole);
const mockedCreateOrRefreshInvitation = vi.mocked(createOrRefreshInvitation);
const mockedListOrganizationMembers = vi.mocked(listOrganizationMembers);
const mockedListOrganizationPendingInvitations = vi.mocked(listOrganizationPendingInvitations);

beforeEach(() => {
  vi.clearAllMocks();
  mockedAssertRole.mockReturnValue(null);
  mockedRequireAuthContext.mockResolvedValue({
    context: {
      orgId: "org-1",
      appUserId: "user-1",
      supabase: {
        rpc: vi.fn(async () => ({
          data: [
            {
              monthly_invoice_count: 0,
              active_user_count: 1,
              monthly_invoice_limit: 100,
              max_users: 10,
              workspace_type: "organization",
              plan_id: "plan-1",
              subscription_status: "active",
              grace_period_end: null,
            },
          ],
          error: null,
        })),
      },
    } as never,
    error: null,
  });
  mockedListOrganizationMembers.mockResolvedValue([
    {
      id: "user-1",
      email: "owner@example.com",
      display_name: "Owner",
      role: "admin",
      is_active: true,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
  ] as never);
  mockedListOrganizationPendingInvitations.mockResolvedValue([]);
});

describe("/api/settings/members", () => {
  it("GET returns the member directory for owners", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      currentUserId: "user-1",
      members: [expect.objectContaining({ id: "user-1" })],
      invitations: [],
    });
  });

  it("POST creates a new invitation and writes an audit log", async () => {
    mockedCreateOrRefreshInvitation.mockResolvedValue({
      invitation: {
        id: "invite-1",
        email: "manager@example.com",
        role: "manager",
        invite_url: "http://localhost:3000/getting-started?invite=abc",
      },
      wasRefreshed: false,
    } as never);

    const response = await POST(
      new Request("http://localhost/api/settings/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "manager@example.com",
          role: "manager",
        }),
      }) as never
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        created: true,
        invitation: expect.objectContaining({
          id: "invite-1",
          email: "manager@example.com",
        }),
      })
    );
  });

  it("POST returns a conflict when the email already belongs to another workspace", async () => {
    mockedCreateOrRefreshInvitation.mockRejectedValue(
      new Error("This email address is already active in another workspace.")
    );

    const response = await POST(
      new Request("http://localhost/api/settings/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "manager@example.com",
          role: "manager",
        }),
      }) as never
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        error: expect.objectContaining({
          code: "INVITATION_CONFLICT",
        }),
      })
    );
  });

  it("returns a role guard response for non-owners", async () => {
    mockedAssertRole.mockReturnValue(
      NextResponse.json({ error: { code: "FORBIDDEN_ROLE" } }, { status: 403 })
    );

    const response = await GET();
    expect(response.status).toBe(403);
  });
});
