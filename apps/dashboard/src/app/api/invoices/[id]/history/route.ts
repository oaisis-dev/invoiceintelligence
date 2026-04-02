import { NextRequest, NextResponse } from "next/server";
import { assertLocationAccess, requireAuthContext } from "@/lib/authz";
import { proxyToBackendApi } from "@/lib/backend-api";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuthContext();
  if (authResult.error) {
    return authResult.error;
  }
  const { context } = authResult;

  const { id } = await params;
  const { data: invoice, error: invoiceError } = await context.supabase
    .from("invoices")
    .select("id, location_id")
    .eq("id", id)
    .single();

  if (invoiceError || !invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const locationError = assertLocationAccess(
    context,
    (invoice.location_id as string | null) ?? null
  );
  if (locationError) {
    return locationError;
  }

  const searchParams = new URLSearchParams({
    resource_type: "invoice",
    resource_id: id,
  });

  return proxyToBackendApi("/api/org/activity-events/by-resource", {
    searchParams,
  });
}
