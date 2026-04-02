"use client";

import { useSubscription } from "./subscription-provider";

export function UsageMeter() {
  const { usage, loading } = useSubscription();

  if (loading || !usage || !usage.monthlyInvoiceLimit) return null;

  const percent = Math.min(
    100,
    Math.round(
      (usage.monthlyInvoiceCount / usage.monthlyInvoiceLimit) * 100
    )
  );

  const color =
    percent >= 90
      ? "bg-destructive"
      : percent >= 75
        ? "bg-yellow-500"
        : "bg-primary";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {usage.monthlyInvoiceCount} / {usage.monthlyInvoiceLimit} invoices
        </span>
        <span>{percent}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
