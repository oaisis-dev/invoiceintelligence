import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { appendActivityEventAdmin } from "@/lib/activity-events";
import { createAdminClient } from "@/lib/supabase/admin";
import { declineInvitation } from "@/lib/organization-members";

type DeclinePayload = {
  invitationId?: string;
};

function badRequest(message: string) {
  return NextResponse.json(
    { error: { code: "INVALID_INVITATION_DECLINE", message } },
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

  let body: DeclinePayload;
  try {
    body = (await request.json()) as DeclinePayload;
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

  try {
    const invitation = await declineInvitation(supabase, {
      invitationId: body.invitationId.trim(),
      email: primaryEmail,
    });

    if (!invitation) {
      return NextResponse.json(
        {
          error: {
            code: "INVITATION_NOT_FOUND",
            message: "Invitation not found or already processed.",
          },
        },
        { status: 404 }
      );
    }

    await appendActivityEventAdmin({
      orgId: invitation.org_id,
      actorUserId: null,
      eventType: "member.invite_declined",
      category: "member",
      severity: "info",
      resourceType: "organization_invitation",
      resourceId: invitation.id,
      notificationPolicy: "owners_only",
      payload: {
        member_email: invitation.email,
        role: invitation.role,
      },
    });

    return NextResponse.json({ invitation });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "INVITATION_DECLINE_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "Failed to decline invitation.",
        },
      },
      { status: 500 }
    );
  }
}
