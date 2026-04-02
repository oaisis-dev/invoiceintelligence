import { type NextRequest, NextResponse } from "next/server";

import { requireAuthContext, assertRole } from "@/lib/authz";
import { getBillingService } from "@/lib/billing/config";

export async function POST(request: NextRequest) {
  const authResult = await requireAuthContext();
  if (authResult.error) return authResult.error;
  const { context } = authResult;

  const roleError = assertRole(context, ["admin"]);
  if (roleError) return roleError;

  const origin = request.headers.get("origin") ?? "";
  const billingService = getBillingService();

  try {
    const { url } = await billingService.createPortal(
      context.supabase,
      context.orgId,
      `${origin}/settings`
    );
    return NextResponse.json({ url });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create portal session";
    return NextResponse.json(
      { error: { code: "PORTAL_ERROR", message } },
      { status: 400 }
    );
  }
}
