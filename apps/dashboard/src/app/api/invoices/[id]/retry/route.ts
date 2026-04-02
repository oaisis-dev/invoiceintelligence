import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { publishInvoiceProcessing } from "@/lib/gcp/pubsub";
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
  const supabase = context.supabase;

  // Fetch invoice (RLS-scoped)
  const { data: invoice, error: fetchError } = await supabase
    .from("invoices")
    .select("id, status, org_id, location_id, vendor_name")
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

  // Get latest attempt number
  const { data: lastJob } = await supabase
    .from("processing_jobs")
    .select("attempt")
    .eq("invoice_id", id)
    .order("attempt", { ascending: false })
    .limit(1)
    .single();

  const nextAttempt = (lastJob?.attempt ?? 0) + 1;

  // Full reprocess: reset status, clear all pipeline metadata/columns so
  // every step's should_run returns true, and delete existing line items.
  const { error: updateError } = await supabase
    .from("invoices")
    .update({
      status: "queued",
      error_message: null,
      progress: 0,
      processing_stage: null,
      metadata: {},
      raw_text: null,
      vendor_name: null,
      invoice_number: null,
      invoice_date: null,
      total_amount: null,
      confidence_scores: null,
      duplicate_status: "unchecked",
      duplicate_of: null,
      duplicate_group_id: null,
      // Normalization columns (Phase 3+)
      raw_extraction: {},
      normalized_document: {},
      normalization_status: "pending",
      subtotal_amount: null,
      tax_amount_total: null,
      freight_amount: null,
      shipping_amount: null,
      discount_amount: null,
      currency: null,
    })
    .eq("id", id);

  if (!updateError) {
    // Delete existing line items so classify's should_run returns true
    await supabase.from("invoice_line_items").delete().eq("invoice_id", id);
  }

  if (updateError) {
    return NextResponse.json(
      { error: `Failed to reset invoice: ${updateError.message}` },
      { status: 500 }
    );
  }

  // Create new processing job
  await supabase.from("processing_jobs").insert({
    invoice_id: id,
    attempt: nextAttempt,
    status: "pending",
    metadata: {},
  });

  // Publish to Pub/Sub
  try {
    await publishInvoiceProcessing({
      invoice_id: id,
      org_id: invoice.org_id,
      attempt: nextAttempt,
      source: "retry",
    });
  } catch (err) {
    // Revert if publish fails
    await supabase
      .from("invoices")
      .update({ status: "failed" })
      .eq("id", id);
    return NextResponse.json(
      { error: `Failed to queue retry: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }

  await appendActivityEvent({
    eventType: "invoice.retry_requested",
    category: "invoice",
    severity: "info",
    resourceType: "invoice",
    resourceId: id,
    notificationPolicy: "actor_only",
    payload: {
      attempt: nextAttempt,
      vendor_name: (invoice.vendor_name as string) || "Unknown vendor",
    },
  });

  revalidatePath("/invoices");
  revalidatePath("/");

  return NextResponse.json({ status: "queued", attempt: nextAttempt });
}
