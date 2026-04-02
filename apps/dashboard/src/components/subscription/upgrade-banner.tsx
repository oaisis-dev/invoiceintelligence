"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

import { useSubscription } from "./subscription-provider";

export function UpgradeBanner() {
  const { usage, loading } = useSubscription();

  if (loading || !usage || !usage.monthlyInvoiceLimit) return null;

  const percent = Math.round(
    (usage.monthlyInvoiceCount / usage.monthlyInvoiceLimit) * 100
  );

  if (percent < 80) return null;

  const isLimitReached = percent >= 100;
  const isIndividual = usage.workspaceType === "individual";

  return (
    <div className="rounded-lg border border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20 p-4 flex items-center justify-between gap-4">
      <div className="text-sm">
        {isLimitReached ? (
          <p className="font-medium text-destructive">
            You&apos;ve reached your monthly invoice limit. Upgrade to
            continue uploading.
          </p>
        ) : (
          <p className="text-yellow-800 dark:text-yellow-200">
            You&apos;ve used {percent}% of your monthly invoice quota.
          </p>
        )}
        {isIndividual && (
          <p className="text-xs text-muted-foreground mt-1">
            Need team access?{" "}
            <Link
              href="/settings/billing"
              className="underline hover:text-foreground"
            >
              Convert to Organization
            </Link>
          </p>
        )}
      </div>
      <Button size="sm" asChild>
        <Link href="/settings/billing">Manage Plan</Link>
      </Button>
    </div>
  );
}
