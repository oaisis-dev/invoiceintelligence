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
import { NextResponse, type NextRequest } from "next/server";

/**
 * GET /api/auth/status
 *
 * Returns the current user's provisioning status. Protected by Clerk
 * middleware (requires a valid Clerk session) but uses the admin Supabase
 * client so it works before org_id is in the JWT.
 */
export async function GET(_request: NextRequest) {
  const inviteToken = new URL(_request.url).searchParams.get("invite")?.trim() || null;
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
      { status: 401 }
    );
  }

  const supabase = createAdminClient();

  // Look up the user by any Clerk identity column
  const { data: appUser, error: lookupError } = await supabase
    .from("users")
    .select("id, org_id, role, is_active")
    .or(
      `external_id.eq.${userId},clerk_dev_id.eq.${userId},clerk_prod_id.eq.${userId}`
    )
    .maybeSingle();

  if (lookupError) {
    return NextResponse.json(
      { error: { code: "LOOKUP_FAILED", message: lookupError.message } },
      { status: 500 }
    );
  }

  if (appUser && appUser.is_active) {
    const clerk = await clerkClient();
    await clerk.users.updateUserMetadata(userId, {
      publicMetadata: { org_id: appUser.org_id },
    });

    return NextResponse.json({
      provisioned: true,
      orgId: appUser.org_id,
      role: appUser.role,
    });
  }

  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(userId);
  const primaryEmail = clerkUser.emailAddresses?.[0]?.emailAddress;

  if (!primaryEmail) {
    return NextResponse.json(
      { error: { code: "NO_EMAIL", message: "No email address on Clerk user" } },
      { status: 400 }
    );
  }

  const displayName = buildDisplayName(
    primaryEmail,
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ")
  );
  const identityColumn = getIdentityColumnFromEnv();

  const linkedUser = await linkExistingUserIdentity(supabase, {
    email: primaryEmail,
    displayName,
    clerkUserId: userId,
    identityColumn,
  });

  if (linkedUser?.error) {
    return NextResponse.json(
      {
        error: {
          code: "LINK_FAILED",
          message: linkedUser.error,
        },
      },
      { status: 500 }
    );
  }

  if (linkedUser) {
    await clerk.users.updateUserMetadata(userId, {
      publicMetadata: { org_id: linkedUser.orgId },
    });

    return NextResponse.json({
      provisioned: true,
      orgId: linkedUser.orgId,
      role: linkedUser.role,
    });
  }

  const pendingInvitations = await listPendingInvitationsForEmail(
    supabase,
    primaryEmail
  );
  const highlightedInvitation = inviteToken
    ? await getPendingInvitationForToken(supabase, inviteToken, primaryEmail)
    : null;

  return NextResponse.json({
    provisioned: false,
    email: primaryEmail,
    displayName,
    suggestedIndividualWorkspaceName: buildSuggestedWorkspaceName({
      email: primaryEmail,
      displayName,
      workspaceType: "individual",
    }),
    suggestedOrganizationWorkspaceName: buildSuggestedWorkspaceName({
      email: primaryEmail,
      displayName,
      workspaceType: "organization",
    }),
    pendingInvitations,
    highlightedInvitationId: highlightedInvitation?.id ?? null,
    inviteLookupError:
      inviteToken && !highlightedInvitation
        ? "This invite link is invalid, expired, or tied to a different email."
        : null,
  });
}
