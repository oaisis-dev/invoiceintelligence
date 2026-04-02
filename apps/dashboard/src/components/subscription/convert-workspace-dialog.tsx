"use client";

import { useEffect, useState } from "react";

import type { SubscriptionPlan } from "@/types/database";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ConvertWorkspaceDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/billing/plans")
      .then((res) => res.json())
      .then((data) => {
        const orgPlans = (data.plans ?? []).filter(
          (p: SubscriptionPlan) =>
            p.workspace_type === "organization" &&
            p.tier !== "enterprise"
        );
        setPlans(orgPlans);
        if (orgPlans.length > 0) setSelectedPlanId(orgPlans[0].id);
      });
  }, [open]);

  async function handleConvert() {
    if (!selectedPlanId) return;
    setLoading(true);

    try {
      const res = await fetch("/api/billing/convert-workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetPlanId: selectedPlanId }),
      });

      if (!res.ok) return;
      const data = await res.json();

      if (data.status === "checkout_required" && data.url) {
        window.location.href = data.url;
      } else if (data.status === "converted") {
        window.location.reload();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convert to Organization</DialogTitle>
          <DialogDescription>
            Unlock team features by converting to an organization workspace.
            Your existing data stays intact.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 my-4">
          {plans.map((plan) => (
            <button
              key={plan.id}
              type="button"
              onClick={() => setSelectedPlanId(plan.id)}
              className={`w-full text-left rounded-lg border p-4 transition-colors ${
                selectedPlanId === plan.id
                  ? "border-primary bg-primary/5"
                  : "border-muted hover:border-muted-foreground/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{plan.display_name}</span>
                <span className="text-sm text-muted-foreground">
                  {plan.price_cents === 0
                    ? "Free"
                    : `$${(plan.price_cents / 100).toFixed(0)}/mo`}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Up to {plan.max_users} users, {plan.monthly_invoice_limit}{" "}
                invoices/mo
              </p>
            </button>
          ))}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button onClick={handleConvert} disabled={loading || !selectedPlanId}>
            {loading ? "Converting..." : "Convert"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
