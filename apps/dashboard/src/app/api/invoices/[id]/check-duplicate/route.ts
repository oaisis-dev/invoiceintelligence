import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { assertLocationAccess, requireAuthContext } from "@/lib/authz";
import { appendActivityEvent } from "@/lib/activity-events";

/**
 * Compute a stable lock key from the composite business key.
 *
 * Uses 6 bytes (48-bit signed int) so the value is identical to the
 * Python implementation in workers/src/pipeline/steps/duplicate_check.py.
 */
function computeLockKey(
  orgId: string,
  vendorName: string,
  invoiceNumber: string
): number {
  const raw = `${orgId}:${vendorName.toLowerCase().trim()}:${invoiceNumber.toLowerCase().trim()}`;
  const hash = createHash("md5").update(raw).digest();
  const buf = hash.subarray(0, 6);
  // Read as unsigned 48-bit big-endian, then convert to signed
  let key = buf.readUIntBE(0, 6);
  if (key >= 2 ** 47) key -= 2 ** 48;
  return key;
}

/**
 * Escape Postgres LIKE/ILIKE special characters.
 */
function escapeLike(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

/**
 * POST /api/invoices/[id]/check-duplicate
 *
 * Run an on-demand duplicate check for an already-processed invoice.
 * Business logic mirrors workers/src/pipeline/steps/duplicate_check.py.
 */
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
  const supabase = context.supabase;

  // ---------- Fetch invoice (RLS scoped) -----------
  const { data: invoice, error: fetchError } = await supabase
    .from("invoices")
    .select(
      "id, org_id, location_id, vendor_name, invoice_number, status, duplicate_status, duplicate_group_id, uploaded_at"
    )
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

  if (!invoice.vendor_name || !invoice.invoice_number) {
    return NextResponse.json(
      {
        error:
          "Invoice is missing vendor name or invoice number — cannot check for duplicates",
      },
      { status: 422 }
    );
  }

  const adminSupabase = createAdminClient();

  // ---------- Advisory lock -----------
  const lockKey = computeLockKey(
    invoice.org_id,
    invoice.vendor_name,
    invoice.invoice_number
  );
  await adminSupabase.rpc("advisory_lock_invoice_dedup", {
    lock_key: lockKey,
  });

  try {
    // ---------- Find matching invoices -----------
    const { data: matches } = await supabase
      .from("invoices")
      .select(
        "id, vendor_name, invoice_number, status, duplicate_status, duplicate_group_id, uploaded_at"
      )
      .eq("org_id", invoice.org_id)
      .ilike("vendor_name", escapeLike(invoice.vendor_name))
      .ilike("invoice_number", escapeLike(invoice.invoice_number))
      .neq("id", invoice.id)
      .neq("status", "cancelled");

    const matchList = matches ?? [];

    if (matchList.length === 0) {
      // No duplicates — clear any previous warning
      await supabase
        .from("invoices")
        .update({ duplicate_status: "none" })
        .eq("id", id);

      await appendActivityEvent({
        eventType: "invoice.duplicate_check_requested",
        category: "invoice",
        severity: "info",
        resourceType: "invoice",
        resourceId: id,
        notificationPolicy: "none",
        payload: {
          correction_type: "duplicate_check_manual",
          previous_duplicate_status: invoice.duplicate_status,
          result: "none",
          match_count: 0,
        },
      });

      return NextResponse.json({
        duplicate_status: "none",
        match_count: 0,
      });
    }

    // ---------- Duplicates found — create/join group -----------
    const existingGroupId = matchList.find(
      (m) => m.duplicate_group_id
    )?.duplicate_group_id;
    const groupId =
      existingGroupId ?? crypto.randomUUID();

    // Find the earliest invoice as the "original"
    const allCandidates = [...matchList, invoice];
    const original = allCandidates.reduce((earliest, candidate) => {
      const eAt = earliest.uploaded_at ?? "";
      const cAt = candidate.uploaded_at ?? "";
      return cAt < eAt ? candidate : earliest;
    });
    const duplicateOf =
      original.id !== invoice.id ? original.id : matchList[0].id;

    // Flag this invoice
    await supabase
      .from("invoices")
      .update({
        duplicate_status: "suspected",
        duplicate_of: duplicateOf,
        duplicate_group_id: groupId,
      })
      .eq("id", id);

    // Ensure all matches are in the same group
    for (const match of matchList) {
      if (match.duplicate_group_id !== groupId) {
        const newStatus =
          match.duplicate_status !== "unchecked" &&
          match.duplicate_status !== "none"
            ? match.duplicate_status
            : "suspected";

        await supabase
          .from("invoices")
          .update({
            duplicate_group_id: groupId,
            duplicate_status: newStatus,
          })
          .eq("id", match.id);
      }
    }

    await appendActivityEvent({
      eventType: "invoice.duplicate_check_requested",
      category: "invoice",
      severity: "info",
      resourceType: "invoice",
      resourceId: id,
      notificationPolicy: "none",
      payload: {
        correction_type: "duplicate_check_manual",
        previous_duplicate_status: invoice.duplicate_status,
        result: "suspected",
        match_count: matchList.length,
        group_id: groupId,
      },
    });

    return NextResponse.json({
      duplicate_status: "suspected",
      match_count: matchList.length,
    });
  } finally {
    // ---------- Release advisory lock -----------
    await adminSupabase.rpc("advisory_unlock_invoice_dedup", {
      lock_key: lockKey,
    });
  }
}
