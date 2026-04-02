// ---------------------------------------------------------------------------
// Billing configuration — provider factory + DB plan lookups
// ---------------------------------------------------------------------------

import type { SupabaseClient } from "@supabase/supabase-js";

import type { SubscriptionPlan } from "@/types/database";

import { BillingService } from "./service";
import type { PaymentProvider } from "./types";

// -- Provider factory --------------------------------------------------------

let _provider: PaymentProvider | null = null;
let _service: BillingService | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (_provider) return _provider;

  const providerName = process.env.PAYMENT_PROVIDER ?? "stripe";

  switch (providerName) {
    case "stripe": {
      // Dynamic import to keep stripe isolated
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { StripeProvider } = require("./providers/stripe");
      _provider = new StripeProvider() as PaymentProvider;
      break;
    }
    default:
      throw new Error(`Unknown payment provider: ${providerName}`);
  }

  return _provider;
}

export function getBillingService(): BillingService {
  if (_service) return _service;
  _service = new BillingService(getPaymentProvider());
  return _service;
}

// -- DB plan lookups ---------------------------------------------------------

export async function getActivePlans(
  supabase: SupabaseClient
): Promise<SubscriptionPlan[]> {
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(`Failed to fetch plans: ${error.message}`);
  return (data ?? []) as SubscriptionPlan[];
}

export async function getPlanById(
  supabase: SupabaseClient,
  planId: string
): Promise<SubscriptionPlan | null> {
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("id", planId)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch plan: ${error.message}`);
  return data as SubscriptionPlan | null;
}

export async function getPlanByTier(
  supabase: SupabaseClient,
  workspaceType: string,
  tier: string
): Promise<SubscriptionPlan | null> {
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("workspace_type", workspaceType)
    .eq("tier", tier)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch plan: ${error.message}`);
  return data as SubscriptionPlan | null;
}

export async function getFreePlan(
  supabase: SupabaseClient,
  workspaceType: string
): Promise<SubscriptionPlan> {
  const plan = await getPlanByTier(supabase, workspaceType, "free");
  if (!plan) {
    throw new Error(
      `No free plan found for workspace type: ${workspaceType}`
    );
  }
  return plan;
}
