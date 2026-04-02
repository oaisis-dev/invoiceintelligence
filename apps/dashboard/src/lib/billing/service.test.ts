import { beforeEach, describe, expect, it, vi } from "vitest";
import { BillingService } from "./service";
import type { BillingEvent, PaymentProvider } from "./types";

// Mock config module
vi.mock("./config", () => ({
  getFreePlan: vi.fn(),
  getPlanById: vi.fn(),
}));

import { getFreePlan, getPlanById } from "./config";
const mockedGetFreePlan = vi.mocked(getFreePlan);
const mockedGetPlanById = vi.mocked(getPlanById);

function createMockProvider(): PaymentProvider {
  return {
    name: "test",
    webhookSignatureHeader: "x-test-signature",
    createCustomer: vi.fn().mockResolvedValue("cus_test"),
    createCheckoutSession: vi.fn().mockResolvedValue({ url: "https://checkout.test" }),
    createPortalSession: vi.fn().mockResolvedValue({ url: "https://portal.test" }),
    swapSubscriptionPrice: vi.fn().mockResolvedValue(undefined),
    cancelSubscription: vi.fn().mockResolvedValue(undefined),
    constructWebhookEvent: vi.fn(),
  };
}

function createMockSupabase() {
  const updateFn = vi.fn().mockReturnValue({ eq: vi.fn() });
  const selectFn = vi.fn();

  return {
    from: vi.fn().mockReturnValue({
      select: selectFn,
      update: updateFn,
    }),
    _update: updateFn,
    _select: selectFn,
    _configureSingleSelect(data: unknown) {
      selectFn.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data, error: null }),
          maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
          limit: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
          }),
        }),
      });
    },
  };
}

const FREE_PLAN = {
  id: "free-plan-id",
  workspace_type: "organization",
  tier: "free",
  display_name: "Free",
  monthly_invoice_limit: 10,
  max_users: 3,
  price_cents: 0,
  payment_price_id: null,
  features: [],
  is_active: true,
  sort_order: 0,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const PRO_PLAN = {
  ...FREE_PLAN,
  id: "pro-plan-id",
  tier: "pro",
  display_name: "Pro",
  monthly_invoice_limit: 100,
  max_users: 10,
  price_cents: 10000,
  payment_price_id: "price_test",
};

describe("BillingService", () => {
  let service: BillingService;
  let provider: PaymentProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = createMockProvider();
    service = new BillingService(provider);
  });

  describe("handleBillingEvent — subscription_activated", () => {
    it("updates org with plan limits on activation", async () => {
      const supabase = createMockSupabase();
      supabase._configureSingleSelect({ id: "org-1", workspace_type: "organization" });
      mockedGetPlanById.mockResolvedValue(PRO_PLAN);

      const event: BillingEvent = {
        type: "subscription_activated",
        customerId: "cus_123",
        subscriptionId: "sub_123",
        metadata: { plan_id: "pro-plan-id" },
      };

      await service.handleBillingEvent(supabase as never, event);

      expect(supabase._update).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_subscription_id: "sub_123",
          subscription_status: "active",
          grace_period_end: null,
          plan_id: "pro-plan-id",
          monthly_invoice_limit: 100,
          max_users: 10,
        })
      );
    });

    it("handles workspace conversion on activation", async () => {
      const supabase = createMockSupabase();
      supabase._configureSingleSelect({ id: "org-1", workspace_type: "individual" });
      mockedGetPlanById.mockResolvedValue(PRO_PLAN);

      const event: BillingEvent = {
        type: "subscription_activated",
        customerId: "cus_123",
        subscriptionId: "sub_123",
        metadata: { plan_id: "pro-plan-id", convert_workspace: "true" },
      };

      await service.handleBillingEvent(supabase as never, event);

      expect(supabase._update).toHaveBeenCalledWith(
        expect.objectContaining({
          workspace_type: "organization",
        })
      );
    });
  });

  describe("handleBillingEvent — subscription_canceled", () => {
    it("downgrades to free plan", async () => {
      const supabase = createMockSupabase();
      supabase._configureSingleSelect({ id: "org-1", workspace_type: "organization" });
      mockedGetFreePlan.mockResolvedValue(FREE_PLAN);

      const event: BillingEvent = {
        type: "subscription_canceled",
        customerId: "cus_123",
      };

      await service.handleBillingEvent(supabase as never, event);

      expect(mockedGetFreePlan).toHaveBeenCalledWith(supabase, "organization");
      expect(supabase._update).toHaveBeenCalledWith(
        expect.objectContaining({
          plan_id: "free-plan-id",
          payment_subscription_id: null,
          subscription_status: "canceled",
          monthly_invoice_limit: 10,
          max_users: 3,
        })
      );
    });
  });

  describe("handleBillingEvent — payment_failed", () => {
    it("sets past_due with 14-day grace period", async () => {
      const supabase = createMockSupabase();

      const event: BillingEvent = {
        type: "payment_failed",
        customerId: "cus_123",
        subscriptionId: "sub_123",
      };

      const before = Date.now();
      await service.handleBillingEvent(supabase as never, event);
      const after = Date.now();

      const updateCall = supabase._update.mock.calls[0][0];
      expect(updateCall.subscription_status).toBe("past_due");

      const gracePeriod = new Date(updateCall.grace_period_end);
      const expectedMin = before + 14 * 86400000;
      const expectedMax = after + 14 * 86400000;
      expect(gracePeriod.getTime()).toBeGreaterThanOrEqual(expectedMin);
      expect(gracePeriod.getTime()).toBeLessThanOrEqual(expectedMax);
    });
  });

  describe("handleBillingEvent — payment_succeeded", () => {
    it("clears past_due status", async () => {
      const supabase = createMockSupabase();

      const event: BillingEvent = {
        type: "payment_succeeded",
        customerId: "cus_123",
        subscriptionId: "sub_123",
      };

      await service.handleBillingEvent(supabase as never, event);

      expect(supabase._update).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription_status: "active",
          grace_period_end: null,
        })
      );
    });
  });

  describe("handleBillingEvent — subscription_updated", () => {
    it("updates subscription status", async () => {
      const supabase = createMockSupabase();

      const event: BillingEvent = {
        type: "subscription_updated",
        customerId: "cus_123",
        subscriptionId: "sub_123",
        status: "past_due",
      };

      await service.handleBillingEvent(supabase as never, event);

      expect(supabase._update).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription_status: "past_due",
        })
      );
    });
  });

  describe("getOrCreateCustomer", () => {
    it("returns existing customer ID", async () => {
      const supabase = createMockSupabase();
      supabase._configureSingleSelect({
        payment_customer_id: "cus_existing",
        name: "Test Org",
      });

      const result = await service.getOrCreateCustomer(supabase as never, "org-1");

      expect(result).toBe("cus_existing");
      expect(provider.createCustomer).not.toHaveBeenCalled();
    });
  });

  describe("createCheckout", () => {
    it("creates checkout session with customer", async () => {
      const supabase = createMockSupabase();
      supabase._configureSingleSelect({
        payment_customer_id: "cus_existing",
        name: "Test Org",
      });

      const result = await service.createCheckout(
        supabase as never,
        "org-1",
        "price_test",
        "https://app.test/success",
        "https://app.test/cancel",
        { plan_id: "plan-1" }
      );

      expect(result.url).toBe("https://checkout.test");
      expect(provider.createCheckoutSession).toHaveBeenCalledWith({
        customerId: "cus_existing",
        priceId: "price_test",
        successUrl: "https://app.test/success",
        cancelUrl: "https://app.test/cancel",
        metadata: { plan_id: "plan-1" },
      });
    });
  });

  describe("cancelSubscription", () => {
    it("cancels and downgrades to free plan", async () => {
      const supabase = createMockSupabase();
      supabase._configureSingleSelect({
        payment_subscription_id: "sub_123",
        workspace_type: "organization",
      });
      mockedGetFreePlan.mockResolvedValue(FREE_PLAN);

      await service.cancelSubscription(supabase as never, "org-1");

      expect(provider.cancelSubscription).toHaveBeenCalledWith("sub_123");
      expect(supabase._update).toHaveBeenCalledWith(
        expect.objectContaining({
          plan_id: "free-plan-id",
          payment_subscription_id: null,
          subscription_status: "active",
        })
      );
    });
  });
});
