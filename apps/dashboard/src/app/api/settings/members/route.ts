import { NextRequest, NextResponse } from "next/server";
import { assertRole, forbiddenResponse, requireAuthContext } from "@/lib/authz";
import { appendActivityEvent } from "@/lib/activity-events";
import {
  getSubscriptionUsage,
  canInviteUsers,
} from "@/lib/billing/enforcement";
import {
  createOrRefreshInvitation,
  listOrganizationMembers,
  listOrganizationPendingInvitations,
} from "@/lib/organization-members";

type InvitePayload = {
  email?: string;
  role?: "admin" | "manager";
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function GET() {
  const authResult = await requireAuthContext();
  if (authResult.error) {
    return authResult.error;
  }

  const { context } = authResult;
  const roleError = assertRole(context, ["admin"]);
  if (roleError) {
    return roleError;
  }

  try {
    const [members, invitations] = await Promise.all([
      listOrganizationMembers(context.supabase, context.orgId),
      listOrganizationPendingInvitations(context.supabase, context.orgId),
    ]);

    return NextResponse.json({
      currentUserId: context.appUserId,
      members,
      invitations,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "MEMBERS_LOAD_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "Failed to load organization members.",
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuthContext();
  if (authResult.error) {
    return authResult.error;
  }

  const { context } = authResult;
  const roleError = assertRole(context, ["admin"]);
  if (roleError) {
    return roleError;
  }

  let body: InvitePayload;
  try {
    body = (await request.json()) as InvitePayload;
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_JSON", message: "Invalid JSON body." } },
      { status: 400 }
    );
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const role = body.role === "admin" ? "admin" : body.role === "manager" ? "manager" : null;

  if (!email || !isValidEmail(email)) {
    return NextResponse.json(
      { error: { code: "INVALID_EMAIL", message: "Please provide a valid email address." } },
      { status: 400 }
    );
  }

  if (!role) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_ROLE",
          message: "Invitation role must be 'admin' or 'manager'.",
        },
      },
      { status: 400 }
    );
  }

  // Subscription enforcement: workspace type + user limit
  const usage = await getSubscriptionUsage(context.supabase, context.orgId);
  const inviteCheck = canInviteUsers(usage);
  if (!inviteCheck.allowed) {
    const code =
      usage.workspaceType === "individual"
        ? "INDIVIDUAL_WORKSPACE"
        : "USER_LIMIT_REACHED";
    return forbiddenResponse(code, inviteCheck.reason ?? "Cannot invite users");
  }

  try {
    const { invitation, wasRefreshed } = await createOrRefreshInvitation(context.supabase, {
      orgId: context.orgId,
      email,
      role,
      invitedByUserId: context.appUserId,
    });

    await appendActivityEvent({
      eventType: wasRefreshed ? "member.invite_resent" : "member.invited",
      category: "member",
      severity: "info",
      resourceType: "member",
      notificationPolicy: "none",
      payload: {
        email,
        role,
      },
    });

    return NextResponse.json(
      {
        invitation,
        created: !wasRefreshed,
      },
      { status: wasRefreshed ? 200 : 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create invitation.";
    const status =
      message.includes("already exists")
      || message.includes("already active in another workspace")
        ? 409
        : 500;

    return NextResponse.json(
      {
        error: {
          code: status === 409 ? "INVITATION_CONFLICT" : "INVITATION_CREATE_FAILED",
          message,
        },
      },
      { status }
    );
  }
}
