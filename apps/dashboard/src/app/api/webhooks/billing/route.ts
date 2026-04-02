import { type NextRequest, NextResponse } from "next/server";

import { getBillingService, getPaymentProvider } from "@/lib/billing/config";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const provider = getPaymentProvider();
  const signature = request.headers.get(
    provider.webhookSignatureHeader
  );

  if (!signature) {
    return NextResponse.json(
      { error: "Missing webhook signature" },
      { status: 400 }
    );
  }

  let event;
  try {
    const body = await request.text();
    event = await provider.constructWebhookEvent(body, signature);
  } catch (err) {
    console.error("[billing-webhook] Signature verification failed:", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  // Unrecognized event type — acknowledge and ignore
  if (!event) {
    return NextResponse.json({ received: true });
  }

  try {
    const supabase = createAdminClient();
    const billingService = getBillingService();
    await billingService.handleBillingEvent(supabase, event);
  } catch (err) {
    // Log but return 200 to prevent Stripe retries on deterministic errors
    console.error(`[billing-webhook] Error handling ${event.type} event:`, err);
  }

  return NextResponse.json({ received: true });
}
