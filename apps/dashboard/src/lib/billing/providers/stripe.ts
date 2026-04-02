// ---------------------------------------------------------------------------
// Stripe adapter — implements PaymentProvider interface
// All Stripe SDK usage is isolated to this file.
// ---------------------------------------------------------------------------

import Stripe from "stripe";

import type {
  BillingEvent,
  CreateCheckoutParams,
  CreateCustomerParams,
  CreatePortalParams,
  PaymentProvider,
} from "../types";

function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key, { apiVersion: "2026-02-25.clover" });
}

export class StripeProvider implements PaymentProvider {
  readonly name = "stripe" as const;
  readonly webhookSignatureHeader = "stripe-signature";

  private get stripe() {
    return getStripeClient();
  }

  async createCustomer(params: CreateCustomerParams): Promise<string> {
    const customer = await this.stripe.customers.create({
      name: params.name,
      email: params.email,
      metadata: { org_id: params.orgId },
    });
    return customer.id;
  }

  async createCheckoutSession(
    params: CreateCheckoutParams
  ): Promise<{ url: string }> {
    const session = await this.stripe.checkout.sessions.create({
      customer: params.customerId,
      mode: "subscription",
      line_items: [{ price: params.priceId, quantity: 1 }],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: params.metadata ?? {},
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL");
    }
    return { url: session.url };
  }

  async createPortalSession(
    params: CreatePortalParams
  ): Promise<{ url: string }> {
    const session =
      await this.stripe.billingPortal.sessions.create({
        customer: params.customerId,
        return_url: params.returnUrl,
      });
    return { url: session.url };
  }

  async swapSubscriptionPrice(
    subscriptionId: string,
    newPriceId: string
  ): Promise<void> {
    const subscription =
      await this.stripe.subscriptions.retrieve(subscriptionId);

    const currentItem = subscription.items.data[0];
    if (!currentItem) {
      throw new Error("Subscription has no items");
    }

    await this.stripe.subscriptions.update(subscriptionId, {
      items: [{ id: currentItem.id, price: newPriceId }],
      proration_behavior: "create_prorations",
    });
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    await this.stripe.subscriptions.cancel(subscriptionId);
  }

  async constructWebhookEvent(
    body: string | Buffer,
    signature: string
  ): Promise<BillingEvent | null> {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");

    const event = this.stripe.webhooks.constructEvent(
      body,
      signature,
      secret
    );

    return this.mapStripeEvent(event);
  }

  // -- Map Stripe events to normalized BillingEvent --------------------------

  private mapStripeEvent(event: Stripe.Event): BillingEvent | null {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data
          .object as Stripe.Checkout.Session;
        if (session.mode !== "subscription" || !session.subscription) {
          return null;
        }
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id;
        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id ?? "";
        return {
          type: "subscription_activated",
          customerId,
          subscriptionId,
          metadata: (session.metadata as Record<string, string>) ?? undefined,
        };
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId =
          typeof sub.customer === "string"
            ? sub.customer
            : sub.customer.id;
        return {
          type: "subscription_updated",
          customerId,
          subscriptionId: sub.id,
          status: this.mapSubscriptionStatus(sub.status),
        };
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId =
          typeof sub.customer === "string"
            ? sub.customer
            : sub.customer.id;
        return {
          type: "subscription_canceled",
          customerId,
        };
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id ?? "";
        const sub = invoice.parent?.subscription_details?.subscription;
        const subscriptionId =
          typeof sub === "string" ? sub : sub?.id ?? "";
        return {
          type: "payment_failed",
          customerId,
          subscriptionId,
        };
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id ?? "";
        const sub = invoice.parent?.subscription_details?.subscription;
        const subscriptionId =
          typeof sub === "string" ? sub : sub?.id ?? "";
        return {
          type: "payment_succeeded",
          customerId,
          subscriptionId,
        };
      }

      default:
        return null;
    }
  }

  private mapSubscriptionStatus(
    status: Stripe.Subscription.Status
  ): "active" | "past_due" | "canceled" {
    switch (status) {
      case "active":
      case "trialing":
        return "active";
      case "past_due":
        return "past_due";
      case "incomplete":
      case "canceled":
      case "unpaid":
      case "incomplete_expired":
        return "canceled";
      default:
        return "active";
    }
  }
}
