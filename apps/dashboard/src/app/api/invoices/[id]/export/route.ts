import {
  parseOrgSettings,
  resolveExportDestination,
} from "@/lib/settings/export-routing";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  assertLocationAccess,
  assertRole,
  requireAuthContext,
} from "@/lib/authz";
import { appendActivityEvent } from "@/lib/activity-events";
import { generateInvoiceXlsx } from "@/lib/export/generate-xlsx";
import { parseInvoiceCharges } from "@/lib/mismatch";

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

  // ---------- Fetch invoice + line items (RLS scoped) -----------
  const { data: invoice, error: fetchError } = await context.supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !invoice) {
    return NextResponse.json(
      { error: { message: "Invoice not found" } },
      { status: 404 }
    );
  }

  const locationError = assertLocationAccess(
    context,
    (invoice.location_id as string | null) ?? null
  );
  if (locationError) {
    return locationError;
  }

  const isReExport = invoice.status === "exported";
  const canExport = invoice.status === "approved" || isReExport;

  if (!canExport) {
    return NextResponse.json(
      {
        error: {
          message: `Invoice must be approved or exported before export. Current status: "${invoice.status}"`,
        },
      },
      { status: 400 }
    );
  }

  const { data: organization, error: organizationError } = await context.supabase
    .from("organizations")
    .select("settings")
    .eq("id", invoice.org_id)
    .single();

  if (organizationError || !organization) {
    return NextResponse.json(
      {
        error: {
          message: `Failed to load organization export settings: ${organizationError?.message ?? "organization not found"}`,
        },
      },
      { status: 500 }
    );
  }

  const parsedSettings = parseOrgSettings(
    (organization.settings ?? {}) as Record<string, unknown>
  );
  const destinationResolution = resolveExportDestination(
    parsedSettings.export_routing,
    invoice.location_id
  );
  const destination = destinationResolution.destination ?? "download";

  const { data: lineItems, error: lineItemsError } = await context.supabase
    .from("invoice_line_items")
    .select("*")
    .eq("invoice_id", id)
    .order("sort_order", { ascending: true });

  if (lineItemsError) {
    return NextResponse.json(
      {
        error: {
          message: `Failed to fetch line items: ${lineItemsError.message}`,
        },
      },
      { status: 500 }
    );
  }

  // ---------- Update status to exported -----------
  const now = new Date().toISOString();
  const metadata =
    invoice.metadata && typeof invoice.metadata === "object"
      ? { ...(invoice.metadata as Record<string, unknown>) }
      : {};
  metadata.export = {
    destination,
    destination_source: destinationResolution.source,
    exported_at: now,
  };

  const { error: updateError } = await context.supabase
    .from("invoices")
    .update({
      status: "exported",
      exported_at: now,
      metadata,
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json(
      {
        error: {
          message: `Failed to update export status: ${updateError.message}`,
        },
      },
      { status: 500 }
    );
  }

  await appendActivityEvent({
    eventType: "invoice.exported",
    category: "invoice",
    severity: "info",
    resourceType: "invoice",
    resourceId: id,
    notificationPolicy: "actor_only",
    payload: {
      vendor_name: invoice.vendor_name ?? "",
      total: invoice.total_amount ?? "",
      export_target: destination,
    },
  });

  revalidatePath("/invoices");
  revalidatePath("/");

  // ---------- Generate Excel file -----------
  const safeNumber = (invoice.invoice_number ?? id).replace(/[^a-zA-Z0-9._-]/g, "_");
  const filename = `invoice-${safeNumber}.xlsx`;
  const charges = parseInvoiceCharges(
    (invoice.metadata ?? {}) as Record<string, unknown>,
  );
  const buffer = await generateInvoiceXlsx(
    {
      vendor_name: invoice.vendor_name as string | null,
      invoice_number: invoice.invoice_number as string | null,
      invoice_date: invoice.invoice_date as string | null,
      total_amount: invoice.total_amount as number | null,
    },
    (lineItems ?? []).map((item: Record<string, unknown>) => ({
      sort_order: item.sort_order as number,
      item_code: (item.item_code as string | null) ?? null,
      description: (item.description as string | null) ?? null,
      quantity: (item.quantity as number | null) ?? null,
      size: (item.size as string | null) ?? null,
      unit: (item.unit as string | null) ?? null,
      unit_price: (item.unit_price as number | null) ?? null,
      extended_price: (item.extended_price as number | null) ?? null,
      tax_amount: (item.tax_amount as number | null) ?? null,
      category: (item.category as string | null) ?? null,
      account: (item.account as number | null) ?? null,
      sub_account: (item.sub_account as number | null) ?? null,
    })),
    destination,
    now,
    charges,
  );

  return new Response(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
