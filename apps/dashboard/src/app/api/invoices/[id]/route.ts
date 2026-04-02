import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  assertLocationAccess,
  assertRole,
  requireAuthContext,
} from "@/lib/authz";
import { appendActivityEvent } from "@/lib/activity-events";
import { computeHasMismatch, parseInvoiceCharges } from "@/lib/mismatch";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteFromGcs } from "@/lib/gcp/storage";

/** Statuses that allow manual field edits. */
const EDITABLE_STATUSES = new Set(["ready_for_review", "exported"]);

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuthContext();
  if (authResult.error) {
    return authResult.error;
  }
  const { context } = authResult;

  const { id } = await params;
  const supabase = context.supabase;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { data: existing, error: fetchError } = await supabase
    .from("invoices")
    .select("id, status, location_id, vendor_name")
    .eq("id", id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const locationError = assertLocationAccess(
    context,
    (existing.location_id as string | null) ?? null
  );
  if (locationError) {
    return locationError;
  }

  const shouldCancelInvoice = body.status === "cancelled";
  if (body.status !== undefined && !shouldCancelInvoice) {
    return NextResponse.json(
      {
        error:
          'Only status transition supported by this route is "cancelled".',
      },
      { status: 400 }
    );
  }

  if (shouldCancelInvoice) {
    const roleError = assertRole(context, ["admin", "manager"]);
    if (roleError) {
      return roleError;
    }
    if (existing.status === "cancelled") {
      return NextResponse.json(
        { error: "Invoice is already cancelled" },
        { status: 400 }
      );
    }
  } else if (!EDITABLE_STATUSES.has(existing.status)) {
    return NextResponse.json(
      {
        error: `Invoice cannot be edited in status "${existing.status}". Allowed: ${[...EDITABLE_STATUSES].join(", ")}`,
      },
      { status: 400 }
    );
  }

  const allowedFields = [
    "vendor_name",
    "invoice_number",
    "invoice_date",
    "total_amount",
  ] as const;

  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field];
    }
  }

  if (shouldCancelInvoice) {
    updates.status = "cancelled";
    if (typeof body.rejection_note === "string") {
      updates.rejection_note = body.rejection_note.trim();
    }
  }

  // Handle non-invoice override: clear the flag and merge into metadata
  const metaBody = body.metadata as Record<string, unknown> | undefined;
  const isNonInvoiceOverride =
    metaBody && typeof metaBody === "object" && metaBody.non_invoice_override === true;

  if (isNonInvoiceOverride) {
    updates.is_non_invoice = false;
    // Merge non_invoice_override flag into existing metadata
    const { data: current } = await supabase
      .from("invoices")
      .select("metadata")
      .eq("id", id)
      .single();
    const currentMeta = (current?.metadata as Record<string, unknown>) ?? {};
    updates.metadata = { ...currentMeta, non_invoice_override: true };
  }

  const lineItemsProvided = "line_items" in body && Array.isArray(body.line_items);
  if (Object.keys(updates).length === 0 && !lineItemsProvided) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 }
    );
  }

  if (Object.keys(updates).length > 0) {
    const { error: updateError } = await supabase
      .from("invoices")
      .update(updates)
      .eq("id", id);

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to update invoice: ${updateError.message}` },
        { status: 500 }
      );
    }
  }

  if (lineItemsProvided) {
    // Fetch existing item IDs so we can diff
    const { data: existingItems, error: fetchItemsError } = await supabase
      .from("invoice_line_items")
      .select("id")
      .eq("invoice_id", id);

    if (fetchItemsError) {
      return NextResponse.json(
        { error: `Failed to fetch line items: ${fetchItemsError.message}` },
        { status: 500 }
      );
    }

    const existingIds = new Set((existingItems ?? []).map((r) => r.id as string));
    const incomingItems = body.line_items as Record<string, unknown>[];

    const toInsert: Record<string, unknown>[] = [];
    const toUpdate: Record<string, unknown>[] = [];
    const incomingIds = new Set<string>();

    for (let i = 0; i < incomingItems.length; i++) {
      const item = incomingItems[i]!;
      const itemId = item.id as string | undefined;
      const fields = {
        invoice_id: id,
        sort_order: i,
        quantity: item.quantity ?? null,
        size: item.size ?? null,
        unit: item.unit ?? null,
        description: item.description ?? null,
        item_code: item.item_code ?? null,
        unit_price: item.unit_price ?? null,
        extended_price: item.extended_price ?? null,
        tax_amount: item.tax_amount ?? null,
        category: item.category ?? null,
        account: item.account ?? null,
        sub_account: item.sub_account ?? null,
        extra: item.extra ?? {},
      };

      if (itemId && existingIds.has(itemId)) {
        incomingIds.add(itemId);
        toUpdate.push({ id: itemId, ...fields });
      } else {
        toInsert.push(fields);
      }
    }

    // Delete items that were removed by the user
    const toDeleteIds = [...existingIds].filter((eid) => !incomingIds.has(eid));

    if (toDeleteIds.length > 0) {
      const { error: deleteError } = await supabase
        .from("invoice_line_items")
        .delete()
        .in("id", toDeleteIds);

      if (deleteError) {
        return NextResponse.json(
          { error: `Failed to delete line items: ${deleteError.message}` },
          { status: 500 }
        );
      }
    }

    // Update existing items
    for (const row of toUpdate) {
      const { id: rowId, ...fields } = row;
      const { error: updateError } = await supabase
        .from("invoice_line_items")
        .update(fields)
        .eq("id", rowId);

      if (updateError) {
        return NextResponse.json(
          { error: `Failed to update line item: ${updateError.message}` },
          { status: 500 }
        );
      }
    }

    // Insert new items
    if (toInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("invoice_line_items")
        .insert(toInsert);

      if (insertError) {
        return NextResponse.json(
          { error: `Failed to insert line items: ${insertError.message}` },
          { status: 500 }
        );
      }
    }
  }

  await appendActivityEvent({
    eventType: "invoice.corrected",
    category: "invoice",
    severity: "info",
    resourceType: "invoice",
    resourceId: id,
    notificationPolicy: "actor_only",
    payload: {
      updated_fields: Object.keys(updates),
      vendor_name: (updates.vendor_name as string) || (existing.vendor_name as string) || "Unknown vendor",
    },
  });

  const { data: updated, error: refetchError } = await supabase
    .from("invoices")
    .select("*, invoice_line_items(*)")
    .eq("id", id)
    .single();

  if (refetchError || !updated) {
    return NextResponse.json(
      { error: "Invoice updated but failed to refetch" },
      { status: 500 }
    );
  }

  // Recompute mismatch flag from the refetched data
  const updatedRecord = updated as Record<string, unknown>;
  const lineItemsArr = (updatedRecord.invoice_line_items ?? []) as {
    extended_price: number | null;
    tax_amount: number | null;
  }[];
  const charges = parseInvoiceCharges(
    updatedRecord.metadata as Record<string, unknown>
  );
  const hasMismatch = computeHasMismatch(
    updatedRecord.total_amount as number | null,
    lineItemsArr,
    charges
  );
  if ((updatedRecord.has_total_mismatch as boolean) !== hasMismatch) {
    await supabase
      .from("invoices")
      .update({ has_total_mismatch: hasMismatch })
      .eq("id", id);
  }

  // Purge cached pages so dashboard counts and invoices list stay current
  revalidatePath("/invoices");
  revalidatePath("/");

  // Reshape joined line items to match the expected `line_items` key
  const { invoice_line_items, ...invoice } = updatedRecord;
  return NextResponse.json({
    ...invoice,
    has_total_mismatch: hasMismatch,
    line_items: invoice_line_items ?? [],
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuthContext();
  if (authResult.error) {
    return authResult.error;
  }
  const { context } = authResult;

  const roleError = assertRole(context, ["admin", "manager"]);
  if (roleError) {
    return roleError;
  }

  const { id } = await params;

  // Fetch invoice (uses RLS-scoped client for SELECT)
  const { data: existing, error: fetchError } = await context.supabase
    .from("invoices")
    .select("id, status, location_id, vendor_name, invoice_number, original_filename, stored_path")
    .eq("id", id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const locationError = assertLocationAccess(
    context,
    (existing.location_id as string | null) ?? null
  );
  if (locationError) {
    return locationError;
  }

  await appendActivityEvent({
    eventType: "invoice.deleted",
    category: "invoice",
    severity: "info",
    resourceType: "invoice",
    resourceId: id,
    notificationPolicy: "actor_only",
    payload: {
      vendor_name: existing.vendor_name ?? "",
    },
  });

  // Delete PDF from GCS (ignore if already missing)
  if (existing.stored_path) {
    await deleteFromGcs(existing.stored_path as string);
  }

  // Delete invoice record (admin client bypasses RLS; CASCADE handles children)
  const adminSupabase = createAdminClient();
  const { error: deleteError } = await adminSupabase
    .from("invoices")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return NextResponse.json(
      { error: `Failed to delete invoice: ${deleteError.message}` },
      { status: 500 }
    );
  }

  revalidatePath("/invoices");
  revalidatePath("/");

  return NextResponse.json({ success: true });
}
