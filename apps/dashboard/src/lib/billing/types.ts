// ---------------------------------------------------------------------------
// Provider-agnostic billing types
// ---------------------------------------------------------------------------

import type { SubscriptionStatus } from "@/types/database";

// -- Normalized billing events (from any provider's webhooks) ----------------

export type BillingEvent =
  | {
      type: "subscription_activated";
      customerId: string;
      subscriptionId: string;
      metadata?: Record<string, string>;
    }
  | {
      type: "subscription_updated";
      customerId: string;
      subscriptionId: string;
      status: SubscriptionStatus;
    }
  | { type: "subscription_canceled"; customerId: string }
  | {
      type: "payment_failed";
      customerId: string;
      subscriptionId: string;
    }
  | {
      type: "payment_succeeded";
      customerId: string;
      subscriptionId: string;
    };

// -- Payment provider interface ----------------------------------------------

export interface CreateCustomerParams {
  orgId: string;
  name: string;
  email: string;
}

export interface CreateCheckoutParams {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

export interface CreatePortalParams {
  customerId: string;
  returnUrl: string;
}

export interface PaymentProvider {
  readonly name: string;
  readonly webhookSignatureHeader: string;

  // Customer management
  createCustomer(params: CreateCustomerParams): Promise<string>;

  // Checkout & portal
  createCheckoutSession(
    params: CreateCheckoutParams
  ): Promise<{ url: string }>;
  createPortalSession(
    params: CreatePortalParams
  ): Promise<{ url: string }>;

  // Subscription management
  swapSubscriptionPrice(
    subscriptionId: string,
    newPriceId: string
  ): Promise<void>;
  cancelSubscription(subscriptionId: string): Promise<void>;

  // Webhook verification — returns null for unrecognized event types
  constructWebhookEvent(
    body: string | Buffer,
    signature: string
  ): Promise<BillingEvent | null>;
}
