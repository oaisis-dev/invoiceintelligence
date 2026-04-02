import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { appendActivityEventAdmin } from "@/lib/activity-events";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildDisplayName,
  getIdentityColumnFromEnv,
} from "@/lib/provisioning";
import { claimInvitation } from "@/lib/organization-members";

type ClaimPayload = {
  invitationId?: string;
};

function badRequest(message: string) {
  return NextResponse.json(
    { error: { code: "INVALID_INVITATION_CLAIM", message } },
    { status: 400 }
  );
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
      { status: 401 }
    );
  }

  let body: ClaimPayload;
  try {
    body = (await request.json()) as ClaimPayload;
  } catch {
    return badRequest("Invalid JSON body.");
  }

  if (typeof body.invitationId !== "string" || !body.invitationId.trim()) {
    return badRequest("invitationId is required.");
  }

  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(userId);
  const primaryEmail = clerkUser.emailAddresses?.[0]?.emailAddress;

  if (!primaryEmail) {
    return NextResponse.json(
      { error: { code: "NO_EMAIL", message: "No email address on Clerk user." } },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const displayName = buildDisplayName(
    primaryEmail,
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ")
  );

  try {
    const claimed = await claimInvitation(supabase, {
      invitationId: body.invitationId.trim(),
      clerkUserId: userId,
      email: primaryEmail,
      displayName,
      identityColumn: getIdentityColumnFromEnv(),
    });

    await clerk.users.updateUserMetadata(userId, {
      publicMetadata: { org_id: claimed.orgId },
    });

    await appendActivityEventAdmin({
      orgId: claimed.orgId,
      actorUserId: claimed.memberId,
      eventType: "member.invite_accepted",
      category: "member",
      severity: "info",
      resourceType: "organization_invitation",
      resourceId: claimed.invitationId,
      notificationPolicy: "owners_only",
      payload: {
        member_email: primaryEmail,
        role: claimed.role,
      },
    });

    // Platform-level event: notify platform admins of new user signup
    await appendActivityEventAdmin({
      orgId: null,
      actorUserId: claimed.memberId,
      eventType: "platform.user_signup",
      category: "platform",
      severity: "info",
      resourceType: "user",
      resourceId: claimed.memberId,
      notificationPolicy: "platform_admins",
      payload: {
        user_email: primaryEmail,
        org_id: claimed.orgId,
      },
    });

    return NextResponse.json({
      provisioned: true,
      orgId: claimed.orgId,
      role: claimed.role,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to claim invitation.";
    const status = message.includes("already provisioned")
      || message.includes("already linked to another workspace")
      || message.includes("already provisioned for another workspace")
      ? 409
      : message.includes("no longer available")
        || message.includes("missing a default location")
        ? 400
        : 500;

    return NextResponse.json(
      {
        error: {
          code:
            status === 409
              ? "ACCOUNT_ALREADY_PROVISIONED"
              : status === 400
                ? "INVITATION_CLAIM_FAILED"
                : "INVITATION_CLAIM_ERROR",
          message,
        },
      },
      { status }
    );
  }
}
