import "server-only";

import { createHash, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptToken, encryptToken } from "@/lib/crypto";
import type {
  OrganizationInvitation,
  UserRole,
  WorkspaceType,
} from "@/types/database";

const INVITATION_EXPIRY_DAYS = 7;

type InvitationRow = Pick<
  OrganizationInvitation,
  | "id"
  | "org_id"
  | "email"
  | "role"
  | "status"
  | "expires_at"
  | "accepted_at"
  | "revoked_at"
  | "created_at"
  | "updated_at"
  | "invited_by_user_id"
  | "token_encrypted"
>;

export type OrganizationMember = {
  id: string;
  email: string;
  display_name: string | null;
  role: Extract<UserRole, "admin" | "manager">;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type OrganizationInvitationSummary = {
  id: string;
  org_id: string;
  organization_name: string;
  organization_slug: string;
  workspace_type: WorkspaceType;
  email: string;
  role: Extract<UserRole, "admin" | "manager">;
  status: OrganizationInvitation["status"];
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
  invited_by_user_id: string | null;
  invited_by_label: string | null;
  invite_url: string;
};

type OrgSummary = {
  id: string;
  name: string;
  slug: string;
  workspace_type: WorkspaceType;
};

type UserSummary = {
  id: string;
  email: string;
  display_name: string | null;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function buildAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

export function createInvitationToken() {
  return randomBytes(24).toString("base64url");
}

export function hashInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function buildInvitationUrl(token: string) {
  return `${buildAppUrl()}/getting-started?invite=${encodeURIComponent(token)}`;
}

function getInvitationTokenEncryptionKey() {
  const key =
    process.env.INVITATION_TOKEN_ENCRYPTION_KEY
    ?? process.env.EMAIL_TOKEN_ENCRYPTION_KEY;

  if (!key) {
    throw new Error(
      "Missing INVITATION_TOKEN_ENCRYPTION_KEY or EMAIL_TOKEN_ENCRYPTION_KEY."
    );
  }

  return key;
}

function getInvitationAccessToken(
  invitation: Pick<OrganizationInvitation, "id" | "token_encrypted">
) {
  if (!invitation.token_encrypted) {
    return invitation.id;
  }

  return decryptToken(
    invitation.token_encrypted,
    getInvitationTokenEncryptionKey()
  );
}

function createInvitationExpiryIso() {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + INVITATION_EXPIRY_DAYS);
  return expiry.toISOString();
}

async function expirePendingInvitations(
  supabase: SupabaseClient,
  filters: { email?: string; orgId?: string } = {}
) {
  let query = supabase
    .from("organization_invitations")
    .update({ status: "expired" })
    .eq("status", "pending")
    .lt("expires_at", new Date().toISOString());

  if (filters.email) {
    query = query.ilike("email", normalizeEmail(filters.email));
  }
  if (filters.orgId) {
    query = query.eq("org_id", filters.orgId);
  }

  const { error } = await query;
  if (error) {
    throw new Error(`Failed to expire invitations: ${error.message}`);
  }
}

async function getOrganizationMap(
  supabase: SupabaseClient,
  orgIds: string[]
) {
  if (orgIds.length === 0) {
    return new Map<string, OrgSummary>();
  }

  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, slug, workspace_type")
    .in("id", Array.from(new Set(orgIds)));

  if (error) {
    throw new Error(`Failed to fetch organizations: ${error.message}`);
  }

  return new Map(
    (data ?? []).map((row) => [
      row.id as string,
      {
        id: row.id as string,
        name: row.name as string,
        slug: row.slug as string,
        workspace_type: row.workspace_type as WorkspaceType,
      },
    ])
  );
}

async function getUserMap(
  supabase: SupabaseClient,
  userIds: string[]
) {
  if (userIds.length === 0) {
    return new Map<string, UserSummary>();
  }

  const { data, error } = await supabase
    .from("users")
    .select("id, email, display_name")
    .in("id", Array.from(new Set(userIds)));

  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`);
  }

  return new Map(
    (data ?? []).map((row) => [
      row.id as string,
      {
        id: row.id as string,
        email: row.email as string,
        display_name: (row.display_name as string | null) ?? null,
      },
    ])
  );
}

async function enrichInvitations(
  supabase: SupabaseClient,
  invitations: InvitationRow[]
): Promise<OrganizationInvitationSummary[]> {
  if (invitations.length === 0) {
    return [];
  }

  const organizations = await getOrganizationMap(
    supabase,
    invitations.map((invitation) => invitation.org_id)
  );
  const inviters = await getUserMap(
    supabase,
    invitations
      .map((invitation) => invitation.invited_by_user_id)
      .filter((value): value is string => Boolean(value))
  );

  return (
    await Promise.all(
      invitations.map(async (invitation) => {
        const organization = organizations.get(invitation.org_id);
        if (!organization) {
          return null;
        }

        const inviter = invitation.invited_by_user_id
          ? inviters.get(invitation.invited_by_user_id)
          : null;
        return {
          id: invitation.id,
          org_id: invitation.org_id,
          organization_name: organization.name,
          organization_slug: organization.slug,
          workspace_type: organization.workspace_type,
          email: invitation.email,
          role: invitation.role,
          status: invitation.status,
          expires_at: invitation.expires_at,
          accepted_at: invitation.accepted_at,
          revoked_at: invitation.revoked_at,
          created_at: invitation.created_at,
          updated_at: invitation.updated_at,
          invited_by_user_id: invitation.invited_by_user_id,
          invited_by_label:
            inviter?.display_name?.trim() || inviter?.email?.trim() || null,
          invite_url: buildInvitationUrl(getInvitationAccessToken(invitation)),
        };
      })
    )
  )
    .filter((value): value is OrganizationInvitationSummary => Boolean(value));
}

export async function listOrganizationMembers(
  supabase: SupabaseClient,
  orgId: string
) {
  const { data, error } = await supabase
    .from("users")
    .select("id, email, display_name, role, is_active, created_at, updated_at")
    .eq("org_id", orgId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch organization members: ${error.message}`);
  }

  return (data ?? []) as OrganizationMember[];
}

export async function listOrganizationPendingInvitations(
  supabase: SupabaseClient,
  orgId: string
) {
  await expirePendingInvitations(supabase, { orgId });

  const { data, error } = await supabase
    .from("organization_invitations")
    .select(
      "id, org_id, email, role, status, expires_at, accepted_at, revoked_at, created_at, updated_at, invited_by_user_id, token_encrypted"
    )
    .eq("org_id", orgId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch invitations: ${error.message}`);
  }

  return enrichInvitations(supabase, (data ?? []) as InvitationRow[]);
}

export async function listPendingInvitationsForEmail(
  supabase: SupabaseClient,
  email: string
) {
  await expirePendingInvitations(supabase, { email });

  const normalizedEmail = normalizeEmail(email);
  const { data, error } = await supabase
    .from("organization_invitations")
    .select(
      "id, org_id, email, role, status, expires_at, accepted_at, revoked_at, created_at, updated_at, invited_by_user_id, token_encrypted"
    )
    .ilike("email", normalizedEmail)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch invitations for email: ${error.message}`);
  }

  return enrichInvitations(supabase, (data ?? []) as InvitationRow[]);
}

export async function getPendingInvitationForToken(
  supabase: SupabaseClient,
  token: string,
  email: string
) {
  await expirePendingInvitations(supabase, { email });

  const normalizedEmail = normalizeEmail(email);
  const invitationBuilder = () =>
    supabase
      .from("organization_invitations")
      .select(
        "id, org_id, email, role, status, expires_at, accepted_at, revoked_at, created_at, updated_at, invited_by_user_id, token_encrypted"
      )
      .ilike("email", normalizedEmail)
      .eq("status", "pending");

  const { data, error } = await invitationBuilder()
    .eq("token_hash", hashInvitationToken(token))
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch invitation token: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const summary = await enrichInvitations(supabase, [data as InvitationRow]);

  return summary[0] ?? null;
}

export async function createOrRefreshInvitation(
  supabase: SupabaseClient,
  params: {
    orgId: string;
    email: string;
    role: Extract<UserRole, "admin" | "manager">;
    invitedByUserId: string;
  }
) {
  const normalizedEmail = normalizeEmail(params.email);

  const { data: existingMember, error: existingMemberError } = await supabase
    .from("users")
    .select("id")
    .eq("org_id", params.orgId)
    .eq("is_active", true)
    .ilike("email", normalizedEmail)
    .maybeSingle();

  if (existingMemberError) {
    throw new Error(`Failed to validate existing members: ${existingMemberError.message}`);
  }

  if (existingMember) {
    throw new Error("An active member with that email already exists in this organization.");
  }

  const { data: existingActiveWorkspaceUser, error: existingActiveWorkspaceUserError } =
    await supabase
      .from("users")
      .select("id, org_id")
      .ilike("email", normalizedEmail)
      .eq("is_active", true)
      .maybeSingle();

  if (existingActiveWorkspaceUserError) {
    throw new Error(
      `Failed to validate active workspace memberships: ${existingActiveWorkspaceUserError.message}`
    );
  }

  if (existingActiveWorkspaceUser) {
    throw new Error("This email address is already active in another workspace.");
  }

  const token = createInvitationToken();
  const tokenHash = hashInvitationToken(token);
  const tokenEncrypted = encryptToken(
    token,
    getInvitationTokenEncryptionKey()
  );
  const expiresAt = createInvitationExpiryIso();

  const { data: existingInvitation, error: invitationLookupError } = await supabase
    .from("organization_invitations")
    .select("id")
    .eq("org_id", params.orgId)
    .ilike("email", normalizedEmail)
    .eq("status", "pending")
    .maybeSingle();

  if (invitationLookupError) {
    throw new Error(`Failed to validate existing invitations: ${invitationLookupError.message}`);
  }

  if (existingInvitation) {
    const { data: refreshed, error: refreshError } = await supabase
      .from("organization_invitations")
      .update({
        role: params.role,
        invited_by_user_id: params.invitedByUserId,
        token_hash: tokenHash,
        token_encrypted: tokenEncrypted,
        expires_at: expiresAt,
        revoked_at: null,
        accepted_at: null,
      })
      .eq("id", existingInvitation.id)
      .select(
        "id, org_id, email, role, status, expires_at, accepted_at, revoked_at, created_at, updated_at, invited_by_user_id, token_encrypted"
      )
      .single();

    if (refreshError || !refreshed) {
      throw new Error(`Failed to refresh invitation: ${refreshError?.message}`);
    }

    const [summary] = await enrichInvitations(supabase, [refreshed as InvitationRow]);

    return { invitation: summary, token, wasRefreshed: true };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("organization_invitations")
    .insert({
      org_id: params.orgId,
      email: normalizedEmail,
      role: params.role,
      invited_by_user_id: params.invitedByUserId,
      status: "pending",
      token_hash: tokenHash,
      token_encrypted: tokenEncrypted,
      expires_at: expiresAt,
    })
    .select(
      "id, org_id, email, role, status, expires_at, accepted_at, revoked_at, created_at, updated_at, invited_by_user_id, token_encrypted"
    )
    .single();

  if (insertError || !inserted) {
    throw new Error(`Failed to create invitation: ${insertError?.message}`);
  }

  const [summary] = await enrichInvitations(supabase, [inserted as InvitationRow]);

  return { invitation: summary, token, wasRefreshed: false };
}

export async function revokeInvitation(
  supabase: SupabaseClient,
  params: {
    orgId: string;
    invitationId: string;
  }
) {
  const { data: invitation, error: lookupError } = await supabase
    .from("organization_invitations")
    .select(
      "id, org_id, email, role, status, expires_at, accepted_at, revoked_at, created_at, updated_at, invited_by_user_id, token_encrypted"
    )
    .eq("id", params.invitationId)
    .eq("org_id", params.orgId)
    .maybeSingle();

  if (lookupError) {
    throw new Error(`Failed to load invitation: ${lookupError.message}`);
  }

  if (!invitation) {
    return null;
  }

  const { data: updated, error: updateError } = await supabase
    .from("organization_invitations")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
    })
    .eq("id", invitation.id)
    .select(
      "id, org_id, email, role, status, expires_at, accepted_at, revoked_at, created_at, updated_at, invited_by_user_id, token_encrypted"
    )
    .single();

  if (updateError || !updated) {
    throw new Error(`Failed to revoke invitation: ${updateError?.message}`);
  }

  const [summary] = await enrichInvitations(supabase, [updated as InvitationRow]);
  return summary ?? null;
}

export async function countOwners(
  supabase: SupabaseClient,
  orgId: string
) {
  const { count, error } = await supabase
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("is_active", true)
    .eq("role", "admin");

  if (error) {
    throw new Error(`Failed to count organization owners: ${error.message}`);
  }

  return count ?? 0;
}

export async function updateMemberRole(
  supabase: SupabaseClient,
  params: {
    orgId: string;
    memberId: string;
    role: Extract<UserRole, "admin" | "manager">;
  }
) {
  const { data: member, error: memberError } = await supabase
    .from("users")
    .select("id, org_id, role, is_active")
    .eq("id", params.memberId)
    .eq("org_id", params.orgId)
    .maybeSingle();

  if (memberError) {
    throw new Error(`Failed to load member: ${memberError.message}`);
  }

  if (!member || !member.is_active) {
    return null;
  }

  if (member.role === "admin" && params.role !== "admin") {
    const ownerCount = await countOwners(supabase, params.orgId);
    if (ownerCount <= 1) {
      throw new Error("At least one owner must remain on the organization.");
    }
  }

  const { data: updated, error: updateError } = await supabase
    .from("users")
    .update({ role: params.role })
    .eq("id", params.memberId)
    .select("id, email, display_name, role, is_active, created_at, updated_at")
    .single();

  if (updateError || !updated) {
    throw new Error(`Failed to update member role: ${updateError?.message}`);
  }

  return {
    member: updated as OrganizationMember,
    previousRole: member.role as Extract<UserRole, "admin" | "manager">,
  };
}

export async function deactivateMember(
  supabase: SupabaseClient,
  params: {
    orgId: string;
    memberId: string;
  }
) {
  const { data: member, error: memberError } = await supabase
    .from("users")
    .select("id, org_id, role, is_active")
    .eq("id", params.memberId)
    .eq("org_id", params.orgId)
    .maybeSingle();

  if (memberError) {
    throw new Error(`Failed to load member: ${memberError.message}`);
  }

  if (!member || !member.is_active) {
    return null;
  }

  if (member.role === "admin") {
    const ownerCount = await countOwners(supabase, params.orgId);
    if (ownerCount <= 1) {
      throw new Error("At least one owner must remain on the organization.");
    }
  }

  const { data: updated, error: updateError } = await supabase
    .from("users")
    .update({ is_active: false })
    .eq("id", params.memberId)
    .select("id, email, display_name, role, is_active, created_at, updated_at")
    .single();

  if (updateError || !updated) {
    throw new Error(`Failed to deactivate member: ${updateError?.message}`);
  }

  return {
    member: updated as OrganizationMember,
    previousRole: member.role as Extract<UserRole, "admin" | "manager">,
    previousIsActive: member.is_active as boolean,
  };
}

export async function claimInvitation(
  supabase: SupabaseClient,
  params: {
    invitationId: string;
    clerkUserId: string;
    email: string;
    displayName: string;
    identityColumn: "clerk_dev_id" | "clerk_prod_id";
  }
) {
  const normalizedEmail = normalizeEmail(params.email);
  await expirePendingInvitations(supabase, { email: normalizedEmail });

  const { data, error } = await supabase.rpc("claim_organization_invitation", {
    p_invitation_id: params.invitationId,
    p_email: normalizedEmail,
    p_display_name: params.displayName,
    p_clerk_user_id: params.clerkUserId,
    p_identity_column: params.identityColumn,
  });

  if (error) {
    throw new Error(error.message);
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.org_id || !row?.member_id || !row?.invitation_id || !row?.role) {
    throw new Error("Invitation claim returned incomplete data.");
  }

  return {
    invitationId: row.invitation_id as string,
    orgId: row.org_id as string,
    role: row.role as Extract<UserRole, "admin" | "manager">,
    memberId: row.member_id as string,
  };
}

export async function declineInvitation(
  supabase: SupabaseClient,
  params: {
    invitationId: string;
    email: string;
  }
) {
  const normalizedEmail = normalizeEmail(params.email);
  await expirePendingInvitations(supabase, { email: normalizedEmail });

  const { data: invitation, error: invitationError } = await supabase
    .from("organization_invitations")
    .select(
      "id, org_id, email, role, status, expires_at, accepted_at, revoked_at, created_at, updated_at, invited_by_user_id, token_encrypted"
    )
    .eq("id", params.invitationId)
    .ilike("email", normalizedEmail)
    .eq("status", "pending")
    .maybeSingle();

  if (invitationError) {
    throw new Error(`Failed to load invitation: ${invitationError.message}`);
  }

  if (!invitation) {
    return null;
  }

  const { data: updated, error: updateError } = await supabase
    .from("organization_invitations")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
      metadata: {
        declined_by_invitee: true,
        declined_at: new Date().toISOString(),
      },
    })
    .eq("id", invitation.id)
    .select(
      "id, org_id, email, role, status, expires_at, accepted_at, revoked_at, created_at, updated_at, invited_by_user_id, token_encrypted"
    )
    .single();

  if (updateError || !updated) {
    throw new Error(`Failed to decline invitation: ${updateError?.message}`);
  }

  const [summary] = await enrichInvitations(supabase, [updated as InvitationRow]);
  return summary ?? null;
}
