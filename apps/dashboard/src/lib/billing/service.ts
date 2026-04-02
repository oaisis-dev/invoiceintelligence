// ---------------------------------------------------------------------------
// BillingService — provider-agnostic business logic
// ---------------------------------------------------------------------------

import type { SupabaseClient } from "@supabase/supabase-js";

import { getFreePlan, getPlanById } from "./config";
import type { BillingEvent, PaymentProvider } from "./types";

const GRACE_PERIOD_DAYS = 14;

export class BillingService {
  constructor(private provider: PaymentProvider) {}

  // -- Webhook event handler -------------------------------------------------

  async handleBillingEvent(
    supabase: SupabaseClient,
    event: BillingEvent
  ): Promise<void> {
    switch (event.type) {
      case "subscription_activated":
        await this.handleActivated(supabase, event);
        break;
      case "subscription_updated":
        await this.handleUpdated(supabase, event);
        break;
      case "subscription_canceled":
        await this.handleCanceled(supabase, event);
        break;
      case "payment_failed":
        await this.handlePaymentFailed(supabase, event);
        break;
      case "payment_succeeded":
        await this.handlePaymentSucceeded(supabase, event);
        break;
    }
  }

  // -- Customer management ---------------------------------------------------

  async getOrCreateCustomer(
    supabase: SupabaseClient,
    orgId: string
  ): Promise<string> {
    // Look up existing customer ID
    const { data: org } = await supabase
      .from("organizations")
      .select("payment_customer_id, name")
      .eq("id", orgId)
      .single();

    if (org?.payment_customer_id) {
      return org.payment_customer_id;
    }

    // Get admin email for the customer record
    const { data: admin } = await supabase
      .from("users")
      .select("email")
      .eq("org_id", orgId)
      .eq("role", "admin")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    const customerId = await this.provider.createCustomer({
      orgId,
      name: org?.name ?? "Unknown",
      email: admin?.email ?? "",
    });

    await supabase
      .from("organizations")
      .update({
        payment_customer_id: customerId,
        payment_provider: this.provider.name,
      })
      .eq("id", orgId);

    return customerId;
  }

  // -- Checkout & Portal -----------------------------------------------------

  async createCheckout(
    supabase: SupabaseClient,
    orgId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
    metadata?: Record<string, string>
  ): Promise<{ url: string }> {
    const customerId = await this.getOrCreateCustomer(supabase, orgId);
    return this.provider.createCheckoutSession({
      customerId,
      priceId,
      successUrl,
      cancelUrl,
      metadata,
    });
  }

  async createPortal(
    supabase: SupabaseClient,
    orgId: string,
    returnUrl: string
  ): Promise<{ url: string }> {
    const { data: org } = await supabase
      .from("organizations")
      .select("payment_customer_id")
      .eq("id", orgId)
      .single();

    if (!org?.payment_customer_id) {
      throw new Error("Organization has no payment customer");
    }

    return this.provider.createPortalSession({
      customerId: org.payment_customer_id,
      returnUrl,
    });
  }

  // -- Subscription management -----------------------------------------------

  async swapSubscription(
    supabase: SupabaseClient,
    orgId: string,
    newPriceId: string
  ): Promise<void> {
    const { data: org } = await supabase
      .from("organizations")
      .select("payment_subscription_id")
      .eq("id", orgId)
      .single();

    if (!org?.payment_subscription_id) {
      throw new Error("Organization has no active subscription");
    }

    await this.provider.swapSubscriptionPrice(
      org.payment_subscription_id,
      newPriceId
    );
  }

  async cancelSubscription(
    supabase: SupabaseClient,
    orgId: string
  ): Promise<void> {
    const { data: org } = await supabase
      .from("organizations")
      .select("payment_subscription_id, workspace_type")
      .eq("id", orgId)
      .single();

    if (org?.payment_subscription_id) {
      await this.provider.cancelSubscription(
        org.payment_subscription_id
      );
    }

    // Downgrade to free plan
    const freePlan = await getFreePlan(
      supabase,
      org?.workspace_type ?? "organization"
    );

    await supabase
      .from("organizations")
      .update({
        plan_id: freePlan.id,
        payment_subscription_id: null,
        subscription_status: "active",
        grace_period_end: null,
        monthly_invoice_limit: freePlan.monthly_invoice_limit,
        max_users: freePlan.max_users,
      })
      .eq("id", orgId);
  }

  // -- Private event handlers ------------------------------------------------

  private async handleActivated(
    supabase: SupabaseClient,
    event: Extract<BillingEvent, { type: "subscription_activated" }>
  ): Promise<void> {
    const planId = event.metadata?.plan_id;
    const orgIdFromMetadata = event.metadata?.org_id;
    const convertWorkspace =
      event.metadata?.convert_workspace === "true";

    // Find org by customer ID, fall back to org_id from checkout metadata
    let org: { id: string; workspace_type: string } | null = null;

    const { data: orgByCustomer } = await supabase
      .from("organizations")
      .select("id, workspace_type")
      .eq("payment_customer_id", event.customerId)
      .single();

    org = orgByCustomer;

    if (!org && orgIdFromMetadata) {
      const { data: orgByMetadata } = await supabase
        .from("organizations")
        .select("id, workspace_type")
        .eq("id", orgIdFromMetadata)
        .single();
      org = orgByMetadata;
    }

    if (!org) {
      console.error(
        `[billing-webhook] handleActivated: no org found for customer=${event.customerId}, metadata org_id=${orgIdFromMetadata}`
      );
      return;
    }

    const updates: Record<string, unknown> = {
      payment_subscription_id: event.subscriptionId,
      subscription_status: "active",
      grace_period_end: null,
    };

    // Resolve plan from metadata
    if (planId) {
      const plan = await getPlanById(supabase, planId);
      if (plan) {
        updates.plan_id = plan.id;
        updates.monthly_invoice_limit = plan.monthly_invoice_limit;
        updates.max_users = plan.max_users;
      }
    }

    // Handle workspace conversion
    if (convertWorkspace) {
      updates.workspace_type = "organization";
    }

    await supabase
      .from("organizations")
      .update(updates)
      .eq("id", org.id);
  }

  private async handleUpdated(
    supabase: SupabaseClient,
    event: Extract<BillingEvent, { type: "subscription_updated" }>
  ): Promise<void> {
    await supabase
      .from("organizations")
      .update({ subscription_status: event.status })
      .eq("payment_customer_id", event.customerId);
  }

  private async handleCanceled(
    supabase: SupabaseClient,
    event: Extract<BillingEvent, { type: "subscription_canceled" }>
  ): Promise<void> {
    // Find org to get workspace_type for free plan lookup
    const { data: org } = await supabase
      .from("organizations")
      .select("id, workspace_type")
      .eq("payment_customer_id", event.customerId)
      .single();

    if (!org) {
      console.error(
        `[billing-webhook] handleCanceled: no org found for customer=${event.customerId}`
      );
      return;
    }

    const freePlan = await getFreePlan(supabase, org.workspace_type);

    await supabase
      .from("organizations")
      .update({
        plan_id: freePlan.id,
        payment_subscription_id: null,
        subscription_status: "canceled",
        monthly_invoice_limit: freePlan.monthly_invoice_limit,
        max_users: freePlan.max_users,
      })
      .eq("id", org.id);
  }

  private async handlePaymentFailed(
    supabase: SupabaseClient,
    event: Extract<BillingEvent, { type: "payment_failed" }>
  ): Promise<void> {
    const gracePeriodEnd = new Date();
    gracePeriodEnd.setDate(
      gracePeriodEnd.getDate() + GRACE_PERIOD_DAYS
    );

    await supabase
      .from("organizations")
      .update({
        subscription_status: "past_due",
        grace_period_end: gracePeriodEnd.toISOString(),
      })
      .eq("payment_customer_id", event.customerId);
  }

  private async handlePaymentSucceeded(
    supabase: SupabaseClient,
    event: Extract<BillingEvent, { type: "payment_succeeded" }>
  ): Promise<void> {
    await supabase
      .from("organizations")
      .update({
        subscription_status: "active",
        grace_period_end: null,
      })
      .eq("payment_customer_id", event.customerId);
  }
}
