import { NextRequest, NextResponse } from "next/server";
import { assertRole, requireAuthContext } from "@/lib/authz";
import { generateCategoryXlsx } from "@/lib/export/generate-category-xlsx";
import type {
  CategoryExportInvoice,
  CategoryExportLineItem,
  CategoryExportFilters,
} from "@/lib/export/generate-category-xlsx";

const BATCH_SIZE = 300;

export async function POST(request: NextRequest) {
  const authResult = await requireAuthContext();
  if (authResult.error) {
    return authResult.error;
  }
  const { context } = authResult;

  const roleError = assertRole(context, ["admin", "manager"]);
  if (roleError) {
    return roleError;
  }

  // ---------- Parse filter body ----------
  let body: CategoryExportFilters = {};
  try {
    body = (await request.json()) as CategoryExportFilters;
  } catch {
    // Empty body is fine — export all invoices
  }

  // ---------- Fetch matching invoices (no pagination) ----------
  let query = context.supabase
    .from("invoices")
    .select("id, vendor_name, invoice_number, invoice_date")
    .order("uploaded_at", { ascending: false });

  if (body.status) {
    query = query.eq("status", body.status);
  }

  if (body.search) {
    query = query.or(
      `vendor_name.ilike.%${body.search}%,invoice_number.ilike.%${body.search}%,original_filename.ilike.%${body.search}%`,
    );
  }

  if (body.source && body.source !== "all") {
    query = query.eq("source", body.source);
  }

  if (body.duplicateStatus) {
    query = query.eq("duplicate_status", body.duplicateStatus);
  }

  if (body.dateFrom) {
    query = query.gte("invoice_date", body.dateFrom);
  }

  if (body.dateTo) {
    query = query.lte("invoice_date", body.dateTo);
  }

  const { data: invoices, error: invoicesError } = await query;

  if (invoicesError) {
    return NextResponse.json(
      { error: { message: `Failed to fetch invoices: ${invoicesError.message}` } },
      { status: 500 },
    );
  }

  if (!invoices || invoices.length === 0) {
    return NextResponse.json(
      { error: { message: "No invoices match the current filters." } },
      { status: 404 },
    );
  }

  // ---------- Fetch line items in batches ----------
  const invoiceIds = invoices.map((inv) => (inv as Record<string, unknown>).id as string);
  const allLineItems: CategoryExportLineItem[] = [];

  for (let i = 0; i < invoiceIds.length; i += BATCH_SIZE) {
    const batch = invoiceIds.slice(i, i + BATCH_SIZE);
    const { data: items, error: itemsError } = await context.supabase
      .from("invoice_line_items")
      .select(
        "invoice_id, item_code, description, quantity, size, unit, unit_price, extended_price, tax_amount, category, account, sub_account",
      )
      .in("invoice_id", batch)
      .order("sort_order", { ascending: true });

    if (itemsError) {
      return NextResponse.json(
        { error: { message: `Failed to fetch line items: ${itemsError.message}` } },
        { status: 500 },
      );
    }

    if (items) {
      for (const item of items) {
        const r = item as Record<string, unknown>;
        allLineItems.push({
          invoice_id: r.invoice_id as string,
          item_code: (r.item_code as string | null) ?? null,
          description: (r.description as string | null) ?? null,
          quantity: (r.quantity as number | null) ?? null,
          size: (r.size as string | null) ?? null,
          unit: (r.unit as string | null) ?? null,
          unit_price: (r.unit_price as number | null) ?? null,
          extended_price: (r.extended_price as number | null) ?? null,
          tax_amount: (r.tax_amount as number | null) ?? null,
          category: (r.category as string | null) ?? null,
          account: (r.account as number | null) ?? null,
          sub_account: (r.sub_account as number | null) ?? null,
        });
      }
    }
  }

  // ---------- Generate Excel ----------
  const now = new Date().toISOString().slice(0, 10);
  const typedInvoices: CategoryExportInvoice[] = invoices.map((inv) => {
    const r = inv as Record<string, unknown>;
    return {
      id: r.id as string,
      vendor_name: (r.vendor_name as string | null) ?? null,
      invoice_number: (r.invoice_number as string | null) ?? null,
      invoice_date: (r.invoice_date as string | null) ?? null,
    };
  });

  const buffer = await generateCategoryXlsx(
    typedInvoices,
    allLineItems,
    body,
    now,
  );

  const filename = `invoice-items-by-category-${now}.xlsx`;

  return new Response(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
