"use client";

import { useState } from "react";
import { CreditCard, ExternalLink, ArrowUpRight, Users, FileText } from "lucide-react";
import { toast } from "sonner";

import { useSubscription } from "@/components/subscription/subscription-provider";
import { useUpgradeCheckout } from "@/hooks/use-upgrade-checkout";
import { UsageMeter } from "@/components/subscription/usage-meter";
import { ConvertWorkspaceDialog } from "@/components/subscription/convert-workspace-dialog";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardContent,
} from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function BillingClient() {
  const { usage, plan, loading, refresh } = useSubscription();
  const [portalLoading, setPortalLoading] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const { startUpgrade, loading: upgradeLoading } = useUpgradeCheckout();

  async function openPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error?.message ?? "Failed to open billing portal");
      }
      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to open billing portal");
      setPortalLoading(false);
    }
  }

  if (loading) {
    return (
      <GlassCard>
        <GlassCardContent className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-6 w-48 rounded bg-muted" />
            <div className="h-4 w-72 rounded bg-muted" />
            <div className="h-2 w-full rounded bg-muted" />
          </div>
        </GlassCardContent>
      </GlassCard>
    );
  }

  const isFreePlan = !plan || plan.tier === "free";
  const isPaid = plan && plan.tier !== "free" && plan.tier !== "enterprise";
  const isEnterprise = plan?.tier === "enterprise";
  const isIndividual = usage?.workspaceType === "individual";
  const isPastDue = usage?.subscriptionStatus === "past_due";
  const gracePeriodEnd = usage?.gracePeriodEnd
    ? new Date(usage.gracePeriodEnd)
    : null;
  const isGracePeriodExpired =
    gracePeriodEnd && gracePeriodEnd <= new Date();

  return (
    <div className="space-y-6">
      {/* Payment warning */}
      {isPastDue && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-medium">Payment overdue</p>
          <p className="mt-1">
            {isGracePeriodExpired
              ? "Your grace period has expired. Uploads are blocked until payment is resolved."
              : `Your payment is past due. Please update your payment method before ${gracePeriodEnd?.toLocaleDateString()}.`}
          </p>
          {isPaid && (
            <Button
              size="sm"
              variant="destructive"
              className="mt-3"
              onClick={openPortal}
              disabled={portalLoading}
            >
              {portalLoading ? "Opening..." : "Update Payment Method"}
            </Button>
          )}
        </div>
      )}

      {/* Current plan */}
      <GlassCard>
        <GlassCardHeader className="px-6 pt-6 pb-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CreditCard className="size-5 text-muted-foreground" />
              <h2 className="text-base font-semibold">Current Plan</h2>
            </div>
            {plan && (
              <Badge variant={isFreePlan ? "secondary" : "default"}>
                {plan.display_name}
              </Badge>
            )}
          </div>
        </GlassCardHeader>
        <GlassCardContent className="px-6 pb-6 pt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border p-4 space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="size-4" />
                Invoice Quota
              </div>
              <p className="text-2xl font-semibold">
                {usage?.monthlyInvoiceCount ?? 0}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  / {usage?.monthlyInvoiceLimit ?? 0} per month
                </span>
              </p>
            </div>
            <div className="rounded-lg border p-4 space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="size-4" />
                Team Members
              </div>
              <p className="text-2xl font-semibold">
                {usage?.activeUserCount ?? 0}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  / {usage?.maxUsers ?? 0} seats
                </span>
              </p>
            </div>
          </div>

          {usage && <UsageMeter />}

          {plan && plan.price_cents > 0 && (
            <p className="text-sm text-muted-foreground">
              ${(plan.price_cents / 100).toFixed(0)}/month
            </p>
          )}

          {isEnterprise && (
            <p className="text-sm text-muted-foreground">
              Enterprise plan with custom limits. Contact support for changes.
            </p>
          )}
        </GlassCardContent>
      </GlassCard>

      {/* Actions */}
      <GlassCard>
        <GlassCardContent className="px-6 py-6">
          <div className="flex flex-wrap gap-3">
            {isFreePlan && (
              <Button onClick={startUpgrade} disabled={upgradeLoading}>
                <ArrowUpRight className="size-4" />
                {upgradeLoading ? "Redirecting..." : "Upgrade Plan"}
              </Button>
            )}

            {isPaid && (
              <Button onClick={openPortal} disabled={portalLoading}>
                <ExternalLink className="size-4" />
                {portalLoading ? "Opening..." : "Manage Billing"}
              </Button>
            )}

            {isIndividual && (
              <Button
                variant="outline"
                onClick={() => setConvertOpen(true)}
              >
                Convert to Organization
              </Button>
            )}
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* Features list */}
      {plan && plan.features.length > 0 && (
        <GlassCard>
          <GlassCardHeader className="px-6 pt-6 pb-0">
            <h2 className="text-base font-semibold">Plan Features</h2>
          </GlassCardHeader>
          <GlassCardContent className="px-6 pb-6 pt-4">
            <ul className="grid gap-2 sm:grid-cols-2">
              {plan.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <span className="size-1.5 rounded-full bg-primary shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </GlassCardContent>
        </GlassCard>
      )}

      <ConvertWorkspaceDialog
        open={convertOpen}
        onOpenChange={(open) => {
          setConvertOpen(open);
          if (!open) refresh();
        }}
      />
    </div>
  );
}
