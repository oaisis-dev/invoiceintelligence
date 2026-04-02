import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { decryptToken } from "@/lib/crypto";
import {
  createOrRefreshInvitation,
  getPendingInvitationForToken,
  hashInvitationToken,
} from "@/lib/organization-members";

const TEST_KEY_HEX =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

function createAwaitableResult<T>(result: T) {
  return {
    then<TResult1 = T, TResult2 = never>(
      onfulfilled?:
        | ((value: T) => TResult1 | PromiseLike<TResult1>)
        | null,
      onrejected?:
        | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
        | null
    ) {
      return Promise.resolve(result).then(onfulfilled, onrejected);
    },
  };
}

describe("organization-members", () => {
  const originalInvitationKey = process.env.INVITATION_TOKEN_ENCRYPTION_KEY;
  const originalEmailKey = process.env.EMAIL_TOKEN_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.INVITATION_TOKEN_ENCRYPTION_KEY = TEST_KEY_HEX;
    process.env.EMAIL_TOKEN_ENCRYPTION_KEY = TEST_KEY_HEX;
  });

  afterEach(() => {
    process.env.INVITATION_TOKEN_ENCRYPTION_KEY = originalInvitationKey;
    process.env.EMAIL_TOKEN_ENCRYPTION_KEY = originalEmailKey;
  });

  it("returns a secret-backed invite URL for new invitations", async () => {
    const state: { insertedInvitation: Record<string, unknown> | null } = {
      insertedInvitation: null,
    };

    const supabase = {
      from(table: string) {
        if (table === "users") {
          return {
            select(selection: string) {
              if (selection === "id" || selection === "id, org_id") {
                return {
                  eq() {
                    return this;
                  },
                  ilike() {
                    return this;
                  },
                  maybeSingle: async () => ({ data: null, error: null }),
                };
              }

              if (selection === "id, email, display_name") {
                return {
                  in: async () => ({
                    data: [
                      {
                        id: "owner-1",
                        email: "owner@example.com",
                        display_name: "Owner",
                      },
                    ],
                    error: null,
                  }),
                };
              }

              throw new Error(`Unexpected users select: ${selection}`);
            },
          };
        }

        if (table === "organizations") {
          return {
            select(selection: string) {
              expect(selection).toBe("id, name, slug, workspace_type");
              return {
                in: async () => ({
                  data: [
                    {
                      id: "org-1",
                      name: "Acme",
                      slug: "acme",
                      workspace_type: "organization",
                    },
                  ],
                  error: null,
                }),
              };
            },
          };
        }

        if (table === "organization_invitations") {
          return {
            select(selection: string) {
              expect(selection).toBe("id");
              return {
                eq() {
                  return this;
                },
                ilike() {
                  return this;
                },
                maybeSingle: async () => ({ data: null, error: null }),
              };
            },
            insert(payload: Record<string, unknown>) {
              state.insertedInvitation = payload;

              return {
                select(selection: string) {
                  expect(selection).toContain("token_encrypted");
                  return {
                    single: async () => ({
                      data: {
                        id: "11111111-1111-4111-8111-111111111111",
                        org_id: "org-1",
                        email: payload.email,
                        role: payload.role,
                        status: payload.status,
                        expires_at: payload.expires_at,
                        accepted_at: null,
                        revoked_at: null,
                        created_at: "2026-03-14T00:00:00Z",
                        updated_at: "2026-03-14T00:00:00Z",
                        invited_by_user_id: payload.invited_by_user_id,
                        token_encrypted: payload.token_encrypted,
                      },
                      error: null,
                    }),
                  };
                },
              };
            },
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      },
    };

    const result = await createOrRefreshInvitation(supabase as never, {
      orgId: "org-1",
      email: "manager@example.com",
      role: "manager",
      invitedByUserId: "owner-1",
    });

    const inviteToken = new URL(result.invitation.invite_url).searchParams.get("invite");
    expect(inviteToken).toBeTruthy();
    expect(inviteToken).not.toBe("11111111-1111-4111-8111-111111111111");
    expect(state.insertedInvitation?.token_hash).toBe(hashInvitationToken(inviteToken!));
    expect(
      decryptToken(
        state.insertedInvitation?.token_encrypted as string,
        TEST_KEY_HEX
      )
    ).toBe(inviteToken);
  });

  it("resolves legacy uuid-style invites through the token hash path", async () => {
    const inviteId = "22222222-2222-4222-8222-222222222222";
    const email = "manager@example.com";
    const lookupFields: string[] = [];

    const supabase = {
      from(table: string) {
        if (table === "organization_invitations") {
          return {
            update() {
              const builder = {
                eq() {
                  return builder;
                },
                lt() {
                  return builder;
                },
                ilike() {
                  return builder;
                },
                then: createAwaitableResult({ error: null }).then,
              };

              return builder;
            },
            select(selection: string) {
              expect(selection).toContain("token_encrypted");
              const builder = {
                ilike() {
                  return builder;
                },
                eq(field: string, value: string) {
                  lookupFields.push(field);
                  if (field === "token_hash") {
                    expect(value).toBe(hashInvitationToken(inviteId));
                  }
                  return builder;
                },
                maybeSingle: async () => ({
                  data: {
                    id: inviteId,
                    org_id: "org-1",
                    email,
                    role: "manager",
                    status: "pending",
                    expires_at: "2026-03-21T00:00:00Z",
                    accepted_at: null,
                    revoked_at: null,
                    created_at: "2026-03-14T00:00:00Z",
                    updated_at: "2026-03-14T00:00:00Z",
                    invited_by_user_id: null,
                    token_encrypted: null,
                  },
                  error: null,
                }),
              };

              return builder;
            },
          };
        }

        if (table === "organizations") {
          return {
            select() {
              return {
                in: async () => ({
                  data: [
                    {
                      id: "org-1",
                      name: "Acme",
                      slug: "acme",
                      workspace_type: "organization",
                    },
                  ],
                  error: null,
                }),
              };
            },
          };
        }

        if (table === "users") {
          return {
            select() {
              return {
                in: async () => ({ data: [], error: null }),
              };
            },
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      },
    };

    const invitation = await getPendingInvitationForToken(
      supabase as never,
      inviteId,
      email
    );

    expect(invitation?.id).toBe(inviteId);
    expect(invitation?.invite_url).toBe(
      `http://localhost:3000/getting-started?invite=${encodeURIComponent(inviteId)}`
    );
    expect(lookupFields).not.toContain("id");
    expect(lookupFields).toContain("token_hash");
  });
});
