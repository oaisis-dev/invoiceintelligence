"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import { useSubscription } from "@/components/subscription/subscription-provider";
import type { SubscriptionPlan } from "@/types/database";

export function useUpgradeCheckout() {
  const { usage } = useSubscription();
  const [loading, setLoading] = useState(false);

  const startUpgrade = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch available plans
      const plansRes = await fetch("/api/billing/plans");
      if (!plansRes.ok) {
        throw new Error("Failed to fetch plans");
      }
      const { plans } = (await plansRes.json()) as { plans: SubscriptionPlan[] };

      // Find the first paid, non-enterprise plan for the current workspace type
      const workspaceType = usage?.workspaceType ?? "organization";
      const upgradePlan = plans.find(
        (p) =>
          p.tier !== "free" &&
          p.tier !== "enterprise" &&
          p.workspace_type === workspaceType &&
          p.is_active &&
          p.payment_price_id,
      );

      if (!upgradePlan) {
        toast.error("No upgrade plan available");
        setLoading(false);
        return;
      }

      // Create checkout session
      const checkoutRes = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: upgradePlan.id }),
      });

      if (!checkoutRes.ok) {
        const data = await checkoutRes.json().catch(() => null);
        throw new Error(data?.error?.message ?? "Failed to create checkout session");
      }

      const { url } = await checkoutRes.json();
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start upgrade");
      setLoading(false);
    }
  }, [usage?.workspaceType]);

  return { startUpgrade, loading };
}
