import { NextRequest, NextResponse } from "next/server";
import { appendActivityEvent } from "@/lib/activity-events";
import { assertRole, requireAuthContext } from "@/lib/authz";
import { getDefaultLocationForOrg } from "@/lib/default-location";
import { approveSenderRecommendations } from "@/lib/email-sender-recommendations";
import { normalizeEmailAddress } from "@/lib/email-sender-governance";

async function syncSenderRecommendations(
  params: Parameters<typeof approveSenderRecommendations>[0]
): Promise<void> {
  try {
    await approveSenderRecommendations(params);
  } catch (error) {
    console.error("Failed to sync sender recommendations after allowlist update", error);
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuthContext();
  if (authResult.error) return authResult.error;
  const { context } = authResult;

  const roleError = assertRole(context, ["admin"]);
  if (roleError) return roleError;

  let body: { scope?: "org" | "location"; email_address?: string };
  try {
    body = (await request.json()) as { scope?: "org" | "location"; email_address?: string };
  } catch {
    return NextResponse.json(
      { error: { message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  if (body.scope !== "org" && body.scope !== "location") {
    return NextResponse.json(
      { error: { message: "scope must be either org or location" } },
      { status: 400 }
    );
  }

  const normalizedEmail = normalizeEmailAddress(body.email_address ?? "");
  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return NextResponse.json(
      { error: { message: "A valid sender email address is required." } },
      { status: 400 }
    );
  }

  const defaultLocation = await getDefaultLocationForOrg(context.supabase, context.orgId);
  const locationId = body.scope === "location" ? defaultLocation.id : null;

  let senderRow:
    | {
        id: string;
        org_id: string;
        location_id: string | null;
        created_by: string | null;
        email_address: string;
        created_at: string;
        updated_at: string;
      }
    | null = null;

  const { data, error } = await context.supabase
    .from("email_allowed_senders")
    .insert({
      org_id: context.orgId,
      location_id: locationId,
      created_by: context.appUserId,
      email_address: normalizedEmail,
    })
    .select("id, org_id, location_id, created_by, email_address, created_at, updated_at")
    .maybeSingle();

  if (error) {
    if (error.code !== "23505") {
      return NextResponse.json(
        { error: { message: `Failed to add allowed sender: ${error.message}` } },
        { status: 500 }
      );
    }

    const existingSenderQuery = context.supabase
      .from("email_allowed_senders")
      .select("id, org_id, location_id, created_by, email_address, created_at, updated_at")
      .eq("org_id", context.orgId)
      .eq("email_address", normalizedEmail);

    const { data: existingSender, error: existingSenderError } =
      locationId === null
        ? await existingSenderQuery.is("location_id", null).maybeSingle()
        : await existingSenderQuery.eq("location_id", locationId).maybeSingle();

    if (existingSenderError || !existingSender) {
      return NextResponse.json(
        { error: { message: `Failed to load existing allowed sender: ${existingSenderError?.message ?? "unknown error"}` } },
        { status: 500 }
      );
    }
    senderRow = existingSender;
  } else {
    senderRow = data;
  }

  await syncSenderRecommendations({
    supabase: context.supabase,
    orgId: context.orgId,
    senderEmail: normalizedEmail,
    scope: body.scope,
    locationId,
  });

  await appendActivityEvent({
    eventType: "email.allowed_sender_added",
    category: "email",
    severity: "info",
    resourceType: "email_allowed_sender",
    notificationPolicy: "none",
    payload: {
      scope: body.scope,
      email_address: normalizedEmail,
      location_id: locationId,
    },
  });

  return NextResponse.json({ sender: senderRow }, { status: 201 });
}
