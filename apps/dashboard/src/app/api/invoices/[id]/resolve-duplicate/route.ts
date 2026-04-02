import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  assertLocationAccess,
  assertRole,
  requireAuthContext,
} from "@/lib/authz";
import { appendActivityEvent } from "@/lib/activity-events";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuthContext();
  if (authResult.error) {
    return authResult.error;
  }
  const { context } = authResult;

  const { id } = await params;
  const { action } = (await request.json()) as {
    action: "dismiss" | "confirm_duplicate";
  };

  if (action !== "dismiss" && action !== "confirm_duplicate") {
    return NextResponse.json(
      { error: "Invalid action. Must be 'dismiss' or 'confirm_duplicate'." },
      { status: 400 }
    );
  }

  const roleError = assertRole(context, ["admin", "manager"]);
  if (roleError) {
    return roleError;
  }

  const supabase = context.supabase;
  const { data: invoice, error: fetchError } = await supabase
    .from("invoices")
    .select("id, status, duplicate_status, location_id")
    .eq("id", id)
    .single();

  if (fetchError || !invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const locationError = assertLocationAccess(
    context,
    (invoice.location_id as string | null) ?? null
  );
  if (locationError) {
    return locationError;
  }

  if (action === "dismiss") {
    const { error: updateError } = await supabase
      .from("invoices")
      .update({ duplicate_status: "dismissed" })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to dismiss: ${updateError.message}` },
        { status: 500 }
      );
    }
  } else {
    const { error: updateError } = await supabase
      .from("invoices")
      .update({
        duplicate_status: "confirmed_duplicate",
        status: "cancelled",
      })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to confirm duplicate: ${updateError.message}` },
        { status: 500 }
      );
    }
  }

  await appendActivityEvent({
    eventType: "invoice.duplicate_resolved",
    category: "invoice",
    severity: "info",
    resourceType: "invoice",
    resourceId: id,
    notificationPolicy: "none",
    payload: {
      correction_type: "duplicate_resolution",
      duplicate_action: action,
      previous_duplicate_status: invoice.duplicate_status,
    },
  });

  revalidatePath("/invoices");
  revalidatePath("/");

  return NextResponse.json({ success: true });
}
