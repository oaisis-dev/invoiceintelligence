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

  let body: { targetPlanId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_BODY", message: "Invalid request body" } },
      { status: 400 }
    );
  }

  if (!body.targetPlanId) {
    return NextResponse.json(
      { error: { code: "MISSING_PLAN_ID", message: "targetPlanId is required" } },
      { status: 400 }
    );
  }

  // Check current workspace type
  const { data: org } = await context.supabase
    .from("organizations")
    .select("workspace_type, payment_subscription_id, plan_id")
    .eq("id", context.orgId)
    .single();

  if (!org) {
    return NextResponse.json(
      { error: { code: "ORG_NOT_FOUND", message: "Organization not found" } },
      { status: 404 }
    );
  }

  if (org.workspace_type === "organization") {
    return forbiddenResponse(
      "ALREADY_ORGANIZATION",
      "This workspace is already an organization"
    );
  }

  // Validate target plan
  const targetPlan = await getPlanById(
    context.supabase,
    body.targetPlanId
  );
  if (!targetPlan || !targetPlan.is_active) {
    return NextResponse.json(
      { error: { code: "PLAN_NOT_FOUND", message: "Target plan not found or inactive" } },
      { status: 404 }
    );
  }

  if (targetPlan.workspace_type !== "organization") {
    return forbiddenResponse(
      "INVALID_TARGET_PLAN",
      "Target plan must be an organization plan"
    );
  }

  const billingService = getBillingService();

  // Scenario 1: Converting to a free org plan
  if (!targetPlan.payment_price_id) {
    // Cancel existing subscription if any
    if (org.payment_subscription_id) {
      await billingService.cancelSubscription(
        context.supabase,
        context.orgId
      );
    }

    // Update workspace type and assign new plan
    await context.supabase
      .from("organizations")
      .update({
        workspace_type: "organization",
        plan_id: targetPlan.id,
        monthly_invoice_limit: targetPlan.monthly_invoice_limit,
        max_users: targetPlan.max_users,
      })
      .eq("id", context.orgId);

    return NextResponse.json({ status: "converted" });
  }

  // Scenario 2: Converting to a paid org plan
  if (org.payment_subscription_id) {
    // Already has a subscription — swap to new price
    await billingService.swapSubscription(
      context.supabase,
      context.orgId,
      targetPlan.payment_price_id
    );

    // Update workspace type and plan immediately
    await context.supabase
      .from("organizations")
      .update({
        workspace_type: "organization",
        plan_id: targetPlan.id,
        monthly_invoice_limit: targetPlan.monthly_invoice_limit,
        max_users: targetPlan.max_users,
      })
      .eq("id", context.orgId);

    return NextResponse.json({ status: "converted" });
  }

  // No existing subscription — redirect to checkout
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get("origin") || "";
  const { url } = await billingService.createCheckout(
    context.supabase,
    context.orgId,
    targetPlan.payment_price_id,
    `${appUrl}/settings?conversion=success`,
    `${appUrl}/settings?conversion=canceled`,
    {
      plan_id: targetPlan.id,
      convert_workspace: "true",
    }
  );

  return NextResponse.json({ status: "checkout_required", url });
}
