import { NextRequest, NextResponse } from "next/server";
import { assertRole, requireAuthContext } from "@/lib/authz";
import { appendActivityEvent } from "@/lib/activity-events";
import {
  createOrRefreshInvitation,
  revokeInvitation,
} from "@/lib/organization-members";

type RouteParams = {
  params: Promise<{ id: string }>;
};

type InvitationActionPayload = {
  action?: "resend" | "revoke";
};

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAuthContext();
  if (authResult.error) {
    return authResult.error;
  }

  const { context } = authResult;
  const roleError = assertRole(context, ["admin"]);
  if (roleError) {
    return roleError;
  }

  let body: InvitationActionPayload;
  try {
    body = (await request.json()) as InvitationActionPayload;
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_JSON", message: "Invalid JSON body." } },
      { status: 400 }
    );
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { error: { code: "INVALID_ID", message: "Invitation id is required." } },
      { status: 400 }
    );
  }

  if (body.action !== "resend" && body.action !== "revoke") {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_ACTION",
          message: "Action must be 'resend' or 'revoke'.",
        },
      },
      { status: 400 }
    );
  }

  try {
    if (body.action === "revoke") {
      const invitation = await revokeInvitation(context.supabase, {
        orgId: context.orgId,
        invitationId: id,
      });

      if (!invitation) {
        return NextResponse.json(
          {
            error: {
              code: "INVITATION_NOT_FOUND",
              message: "Invitation not found.",
            },
          },
          { status: 404 }
        );
      }

      await appendActivityEvent({
        eventType: "member.invite_revoked",
        category: "member",
        severity: "info",
        resourceType: "member",
        notificationPolicy: "none",
        payload: {
          email: invitation.email,
          role: invitation.role,
        },
      });

      return NextResponse.json({ invitation });
    }

    const { data: existingInvitation, error: lookupError } = await context.supabase
      .from("organization_invitations")
      .select("email, role")
      .eq("id", id)
      .eq("org_id", context.orgId)
      .maybeSingle();

    if (lookupError) {
      throw new Error(`Failed to load invitation: ${lookupError.message}`);
    }

    if (!existingInvitation) {
      return NextResponse.json(
        {
          error: {
            code: "INVITATION_NOT_FOUND",
            message: "Invitation not found.",
          },
        },
        { status: 404 }
      );
    }

    const { invitation } = await createOrRefreshInvitation(context.supabase, {
      orgId: context.orgId,
      email: existingInvitation.email as string,
      role: existingInvitation.role as "admin" | "manager",
      invitedByUserId: context.appUserId,
    });

    await appendActivityEvent({
      eventType: "member.invite_resent",
      category: "member",
      severity: "info",
      resourceType: "member",
      notificationPolicy: "none",
      payload: {
        email: invitation.email,
        role: invitation.role,
      },
    });

    return NextResponse.json({ invitation });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "INVITATION_ACTION_FAILED",
          message:
            error instanceof Error ? error.message : "Failed to update invitation.",
        },
      },
      { status: 500 }
    );
  }
}
