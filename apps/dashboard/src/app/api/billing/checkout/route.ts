import { type NextRequest, NextResponse } from "next/server";

import {
  requireAuthContext,
  assertRole,
  forbiddenResponse,
} from "@/lib/authz";
import { getBillingService, getPlanById } from "@/lib/billing/config";

export async function POST(request: NextRequest) {
  const authResult = await requireAuthContext();
  if (authResult.error) return authResult.error;
  const { context } = authResult;

  const roleError = assertRole(context, ["admin"]);
  if (roleError) return roleError;

  let body: { planId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_BODY", message: "Invalid request body" } },
      { status: 400 }
    );
  }

  if (!body.planId) {
    return NextResponse.json(
      { error: { code: "MISSING_PLAN_ID", message: "planId is required" } },
      { status: 400 }
    );
  }

  const plan = await getPlanById(context.supabase, body.planId);
  if (!plan || !plan.is_active) {
    return NextResponse.json(
      { error: { code: "PLAN_NOT_FOUND", message: "Plan not found or inactive" } },
      { status: 404 }
    );
  }

  if (!plan.payment_price_id) {
    return forbiddenResponse(
      "FREE_PLAN",
      "Cannot checkout for a free plan"
    );
  }

  // Verify plan matches org workspace type
  const { data: org } = await context.supabase
    .from("organizations")
    .select("workspace_type")
    .eq("id", context.orgId)
    .single();

  if (org && plan.workspace_type !== org.workspace_type) {
    return forbiddenResponse(
      "WORKSPACE_TYPE_MISMATCH",
      `This plan is for ${plan.workspace_type} workspaces`
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get("origin") || "";
  const billingService = getBillingService();

  try {
    const { url } = await billingService.createCheckout(
      context.supabase,
      context.orgId,
      plan.payment_price_id,
      `${appUrl}/settings?checkout=success`,
      `${appUrl}/settings?checkout=canceled`,
      { plan_id: plan.id }
    );

    return NextResponse.json({ url });
  } catch (err) {
    console.error("[billing/checkout] Failed to create checkout session:", err);
    const message =
      err instanceof Error ? err.message : "Failed to create checkout session";
    return NextResponse.json(
      { error: { code: "CHECKOUT_FAILED", message } },
      { status: 500 }
    );
  }
}
