import { beforeEach, describe, expect, it, vi } from "vitest";
import { linkExistingUserIdentity } from "./provisioning";

function createUsersBuilder(result: { data: unknown; error: unknown }) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  builder.select = vi.fn(() => builder);
  builder.ilike = vi.fn(() => builder);
  builder.maybeSingle = vi.fn(async () => result);
  builder.update = vi.fn(() => builder);
  builder.eq = vi.fn(async () => ({ error: null }));
  return builder;
}

describe("linkExistingUserIdentity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refuses to relink a user that already belongs to another Clerk identity", async () => {
    const usersBuilder = createUsersBuilder({
      data: {
        id: "user-1",
        org_id: "org-1",
        role: "admin",
        is_active: true,
        external_id: "clerk-existing",
        clerk_dev_id: "clerk-existing",
        clerk_prod_id: null,
      },
      error: null,
    });

    const result = await linkExistingUserIdentity(
      {
        from: vi.fn(() => usersBuilder),
      } as never,
      {
        email: "owner@example.com",
        displayName: "Owner",
        clerkUserId: "clerk-new",
        identityColumn: "clerk_dev_id",
      }
    );

    expect(result).toEqual({
      userId: null,
      orgId: null,
      role: null,
      error: "Existing user is already linked to another Clerk account.",
    });
    expect(usersBuilder.update).not.toHaveBeenCalled();
  });
});
