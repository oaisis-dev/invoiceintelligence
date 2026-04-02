import { NextResponse } from "next/server";

import { getActivePlans } from "@/lib/billing/config";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const plans = await getActivePlans(supabase);
    return NextResponse.json({ plans });
  } catch (err) {
    console.error("[billing/plans] Failed to fetch plans:", err);
    return NextResponse.json(
      { error: { code: "PLANS_FETCH_FAILED", message: "Failed to fetch plans" } },
      { status: 500 }
    );
  }
}
