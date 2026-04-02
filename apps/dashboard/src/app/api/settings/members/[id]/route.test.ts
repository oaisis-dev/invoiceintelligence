import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/authz", () => ({
  requireAuthContext: vi.fn(),
  assertRole: vi.fn(() => null),
}));

vi.mock("@/lib/organization-members", () => ({
  deactivateMember: vi.fn(),
  updateMemberRole: vi.fn(),
}));

import { requireAuthContext } from "@/lib/authz";
import { deactivateMember, updateMemberRole } from "@/lib/organization-members";
import { DELETE, PATCH } from "./route";

const mockedRequireAuthContext = vi.mocked(requireAuthContext);
const mockedDeactivateMember = vi.mocked(deactivateMember);
const mockedUpdateMemberRole = vi.mocked(updateMemberRole);

beforeEach(() => {
  vi.clearAllMocks();
  mockedRequireAuthContext.mockResolvedValue({
    context: {
      orgId: "org-1",
      appUserId: "user-1",
      supabase: {},
    } as never,
    error: null,
  });
});

describe("/api/settings/members/[id]", () => {
  it("PATCH updates a member role", async () => {
    mockedUpdateMemberRole.mockResolvedValue({
      member: {
        id: "user-2",
        role: "admin",
      },
      previousRole: "manager",
    } as never);

    const response = await PATCH(
      new Request("http://localhost/api/settings/members/user-2", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "admin" }),
      }) as never,
      { params: Promise.resolve({ id: "user-2" }) }
    );

    expect(response.status).toBe(200);
  });

  it("DELETE deactivates a member", async () => {
    mockedDeactivateMember.mockResolvedValue({
      member: {
        id: "user-2",
        email: "manager@example.com",
        role: "manager",
        is_active: false,
      },
      previousRole: "manager",
      previousIsActive: true,
    } as never);

    const response = await DELETE(
      new Request("http://localhost/api/settings/members/user-2", {
        method: "DELETE",
      }) as never,
      { params: Promise.resolve({ id: "user-2" }) }
    );

    expect(response.status).toBe(204);
  });

  it("returns a last-owner guard response", async () => {
    mockedUpdateMemberRole.mockRejectedValue(
      new Error("At least one owner must remain on the organization.")
    );

    const response = await PATCH(
      new Request("http://localhost/api/settings/members/user-2", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "manager" }),
      }) as never,
      { params: Promise.resolve({ id: "user-2" }) }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        error: expect.objectContaining({
          code: "LAST_OWNER_REQUIRED",
        }),
      })
    );
  });
});
