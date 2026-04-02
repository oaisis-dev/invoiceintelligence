import { NextResponse } from "next/server";
import { appendActivityEvent } from "@/lib/activity-events";
import { assertRole, requireAuthContext } from "@/lib/authz";

type RouteParams = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, props: RouteParams) {
  const { id } = await props.params;

  const authResult = await requireAuthContext();
  if (authResult.error) return authResult.error;
  const { context } = authResult;

  const roleError = assertRole(context, ["admin"]);
  if (roleError) return roleError;

  const { data: sender, error: loadError } = await context.supabase
    .from("email_allowed_senders")
    .select("id, location_id, email_address")
    .eq("id", id)
    .eq("org_id", context.orgId)
    .maybeSingle();

  if (loadError) {
    return NextResponse.json(
      { error: { message: `Failed to load allowed sender: ${loadError.message}` } },
      { status: 500 }
    );
  }

  if (!sender) {
    return NextResponse.json(
      { error: { message: "Allowed sender not found" } },
      { status: 404 }
    );
  }

  const { error: deleteError } = await context.supabase
    .from("email_allowed_senders")
    .delete()
    .eq("id", id)
    .eq("org_id", context.orgId);

  if (deleteError) {
    return NextResponse.json(
      { error: { message: `Failed to remove allowed sender: ${deleteError.message}` } },
      { status: 500 }
    );
  }

  await appendActivityEvent({
    eventType: "email.allowed_sender_removed",
    category: "email",
    severity: "info",
    resourceType: "email_allowed_sender",
    notificationPolicy: "none",
    payload: {
      email_address: sender.email_address,
      location_id: sender.location_id,
      scope: sender.location_id ? "location" : "org",
    },
  });

  return new NextResponse(null, { status: 204 });
}
