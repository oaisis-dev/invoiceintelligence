import { NextRequest, NextResponse } from "next/server";
import { assertRole, requireAuthContext } from "@/lib/authz";
import { appendActivityEvent } from "@/lib/activity-events";
import {
  deactivateMember,
  updateMemberRole,
} from "@/lib/organization-members";

type RouteParams = {
  params: Promise<{ id: string }>;
};

type UpdateMemberPayload = {
  role?: "admin" | "manager";
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

  let body: UpdateMemberPayload;
  try {
    body = (await request.json()) as UpdateMemberPayload;
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_JSON", message: "Invalid JSON body." } },
      { status: 400 }
    );
  }

  if (body.role !== "admin" && body.role !== "manager") {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_ROLE",
          message: "Role must be 'admin' or 'manager'.",
        },
      },
      { status: 400 }
    );
  }

  try {
    const { id } = await params;
    const result = await updateMemberRole(context.supabase, {
      orgId: context.orgId,
      memberId: id,
      role: body.role,
    });

    if (!result) {
      return NextResponse.json(
        { error: { code: "MEMBER_NOT_FOUND", message: "Member not found." } },
        { status: 404 }
      );
    }

    await appendActivityEvent({
      eventType: "member.role_changed",
      category: "member",
      severity: "info",
      resourceType: "user",
      resourceId: result.member.id,
      notificationPolicy: "owners_and_affected",
      payload: {
        member_email: result.member.email ?? "",
        previous_role: result.previousRole,
        new_role: result.member.role,
      },
    });

    return NextResponse.json({ member: result.member });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update member.";
    const status = message.includes("At least one owner") ? 400 : 500;

    return NextResponse.json(
      {
        error: {
          code:
            status === 400 ? "LAST_OWNER_REQUIRED" : "MEMBER_UPDATE_FAILED",
          message,
        },
      },
      { status }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
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
    const { id } = await params;
    const result = await deactivateMember(context.supabase, {
      orgId: context.orgId,
      memberId: id,
    });

    if (!result) {
      return NextResponse.json(
        { error: { code: "MEMBER_NOT_FOUND", message: "Member not found." } },
        { status: 404 }
      );
    }

    await appendActivityEvent({
      eventType: "member.deactivated",
      category: "member",
      severity: "warning",
      resourceType: "user",
      resourceId: result.member.id,
      notificationPolicy: "owners_and_affected",
      payload: {
        member_email: result.member.email ?? "",
        previous_role: result.previousRole,
      },
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to deactivate member.";
    const status = message.includes("At least one owner") ? 400 : 500;

    return NextResponse.json(
      {
        error: {
          code:
            status === 400 ? "LAST_OWNER_REQUIRED" : "MEMBER_DELETE_FAILED",
          message,
        },
      },
      { status }
    );
  }
}
