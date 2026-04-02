import { NextResponse } from "next/server";

import { requireAuthContext } from "@/lib/authz";
import { getPlanById } from "@/lib/billing/config";
import { getSubscriptionUsage } from "@/lib/billing/enforcement";

export async function GET() {
  const authResult = await requireAuthContext();
  if (authResult.error) return authResult.error;
  const { context } = authResult;

  try {
    const usage = await getSubscriptionUsage(
      context.supabase,
      context.orgId
    );

    // Optionally include current plan details
    let plan = null;
    if (usage.planId) {
      plan = await getPlanById(context.supabase, usage.planId);
    }

    return NextResponse.json({ usage, plan });
  } catch (err) {
    console.error("[billing/usage] Failed to get usage:", err);
    return NextResponse.json(
      { error: { code: "USAGE_FETCH_FAILED", message: "Failed to fetch usage data" } },
      { status: 500 }
    );
  }
}
