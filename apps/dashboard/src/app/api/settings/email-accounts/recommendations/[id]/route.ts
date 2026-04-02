import { NextRequest, NextResponse } from "next/server";
import { appendActivityEvent } from "@/lib/activity-events";
import { assertRole, requireAuthContext } from "@/lib/authz";
import { approveSenderRecommendations } from "@/lib/email-sender-recommendations";
import { normalizeEmailAddress } from "@/lib/email-sender-governance";

type RouteParams = { params: Promise<{ id: string }> };

async function syncSenderRecommendations(
  params: Parameters<typeof approveSenderRecommendations>[0]
): Promise<Awaited<ReturnType<typeof approveSenderRecommendations>> | null> {
  try {
    return await approveSenderRecommendations(params);
  } catch (error) {
    console.error("Failed to sync sender recommendations after sender approval", error);
    return null;
  }
}

export async function PATCH(request: NextRequest, props: RouteParams) {
  const { id } = await props.params;

  const authResult = await requireAuthContext();
  if (authResult.error) return authResult.error;
  const { context } = authResult;

  const roleError = assertRole(context, ["admin"]);
  if (roleError) return roleError;

  let body: { action?: "approve_org" | "approve_location" | "dismiss" };
  try {
    body = (await request.json()) as { action?: "approve_org" | "approve_location" | "dismiss" };
  } catch {
    return NextResponse.json(
      { error: { message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  if (!body.action) {
    return NextResponse.json(
      { error: { message: "action is required" } },
      { status: 400 }
    );
  }

  const { data: recommendation, error: loadError } = await context.supabase
    .from("email_sender_recommendations")
    .select(
      "id, org_id, location_id, sender_email, sender_name, sample_subject, status, source_reason, first_seen_at, last_seen_at, seen_count, created_at, updated_at"
    )
    .eq("id", id)
    .eq("org_id", context.orgId)
    .maybeSingle();

  if (loadError) {
    return NextResponse.json(
      { error: { message: `Failed to load sender recommendation: ${loadError.message}` } },
      { status: 500 }
    );
  }

  if (!recommendation) {
    return NextResponse.json(
      { error: { message: "Sender recommendation not found" } },
      { status: 404 }
    );
  }

  const normalizedEmail = normalizeEmailAddress(recommendation.sender_email);

  if (body.action === "dismiss") {
    const { data: dismissedRecommendation, error: dismissError } = await context.supabase
      .from("email_sender_recommendations")
      .update({ status: "dismissed" })
      .eq("id", id)
      .eq("org_id", context.orgId)
      .select(
        "id, org_id, location_id, email_account_id, sender_email, sender_name, sample_subject, status, source_reason, first_seen_at, last_seen_at, seen_count, created_at, updated_at"
      )
      .maybeSingle();

    if (dismissError) {
      return NextResponse.json(
        { error: { message: `Failed to dismiss recommendation: ${dismissError.message}` } },
        { status: 500 }
      );
    }

    await appendActivityEvent({
      eventType: "email.sender_recommendation_dismissed",
      category: "email",
      severity: "info",
      resourceType: "email_sender_recommendation",
      notificationPolicy: "none",
      payload: {
        sender_email: normalizedEmail,
        location_id: recommendation.location_id,
      },
    });

    return NextResponse.json({ recommendation: dismissedRecommendation });
  }

  const senderScope = body.action === "approve_location" ? "location" : "org";
  const senderLocationId = senderScope === "location" ? recommendation.location_id : null;

  if (senderScope === "location" && !senderLocationId) {
    return NextResponse.json(
      { error: { message: "Location-scoped approval is not available for this recommendation." } },
      { status: 400 }
    );
  }

  const { data: sender, error: insertError } = await context.supabase
    .from("email_allowed_senders")
    .insert({
      org_id: context.orgId,
      location_id: senderLocationId,
      created_by: context.appUserId,
      email_address: normalizedEmail,
    })
    .select("id, org_id, location_id, created_by, email_address, created_at, updated_at")
    .maybeSingle();

  if (insertError && insertError.code !== "23505") {
    return NextResponse.json(
      { error: { message: `Failed to approve sender: ${insertError.message}` } },
      { status: 500 }
    );
  }

  const approvalResult = await syncSenderRecommendations({
    supabase: context.supabase,
    orgId: context.orgId,
    senderEmail: normalizedEmail,
    scope: senderScope,
    locationId: senderLocationId,
    currentLocationId: recommendation.location_id,
  });

  const { data: updatedRecommendation, error: updateRecommendationError } = await context.supabase
    .from("email_sender_recommendations")
    .select(
      "id, org_id, location_id, email_account_id, sender_email, sender_name, sample_subject, status, source_reason, first_seen_at, last_seen_at, seen_count, created_at, updated_at"
    )
    .eq("id", id)
    .eq("org_id", context.orgId)
    .maybeSingle();

  if (updateRecommendationError) {
    return NextResponse.json(
      { error: { message: `Failed to reload recommendation: ${updateRecommendationError.message}` } },
      { status: 500 }
    );
  }

  await appendActivityEvent({
    eventType: "email.sender_recommendation_approved",
    category: "email",
    severity: "info",
    resourceType: "email_sender_recommendation",
    notificationPolicy: "none",
    payload: {
      sender_email: normalizedEmail,
      approved_scope: senderScope,
      approved_sender_id: sender?.id ?? null,
      location_id: senderLocationId,
      blocked_by_location_override: approvalResult?.blockedByOverride ?? false,
    },
  });

  return NextResponse.json({
    recommendation: updatedRecommendation,
    sender,
  });
}
