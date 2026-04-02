import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  assertLocationAccess,
  assertRole,
  requireAuthContext,
} from "@/lib/authz";
import { appendActivityEvent } from "@/lib/activity-events";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuthContext();
  if (authResult.error) {
    return authResult.error;
  }
  const { context } = authResult;

  const { id } = await params;
  const roleError = assertRole(context, ["admin", "manager"]);
  if (roleError) {
    return roleError;
  }

  // ---------- Fetch invoice (RLS scoped) -----------
  const { data: invoice, error: fetchError } = await context.supabase
    .from("invoices")
    .select("id, status, location_id")
    .eq("id", id)
    .single();

  if (fetchError || !invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  if (invoice.status === "approved") {
    return NextResponse.json(
      { error: "Invoice is already approved" },
      { status: 400 }
    );
  }

  if (invoice.status !== "ready_for_review") {
    return NextResponse.json(
      {
        error: `Invoice cannot be approved in status "${invoice.status}". Must be "ready_for_review".`,
      },
      { status: 400 }
    );
  }

  const locationError = assertLocationAccess(
    context,
    (invoice.location_id as string | null) ?? null
  );
  if (locationError) {
    return locationError;
  }

  // ---------- Approve -----------
  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await context.supabase
    .from("invoices")
    .update({
      status: "approved",
      approved_by: context.appUserId,
      approved_at: now,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (updateError || !updated) {
    return NextResponse.json(
      { error: `Failed to approve invoice: ${updateError?.message}` },
      { status: 500 }
    );
  }

  await appendActivityEvent({
    eventType: "invoice.approved",
    category: "invoice",
    severity: "info",
    resourceType: "invoice",
    resourceId: id,
    notificationPolicy: "actor_only",
    payload: {
      vendor_name: (updated as Record<string, unknown>).vendor_name ?? "",
      total: (updated as Record<string, unknown>).total_amount ?? "",
    },
  });

  revalidatePath("/invoices");
  revalidatePath("/");

  return NextResponse.json(updated);
}
