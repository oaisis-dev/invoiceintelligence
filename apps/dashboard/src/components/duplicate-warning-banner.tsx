"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";
import { formatStatusLabel } from "@/lib/invoice-status";
import { resolveDuplicate } from "@/lib/api-client";
import { toast } from "sonner";
import type { DuplicateGroupMember, DuplicateStatus } from "@/types/database";

export interface DuplicateWarningBannerProps {
  invoiceId: string;
  duplicateStatus: DuplicateStatus;
  duplicateGroup: DuplicateGroupMember[];
  onResolved?: (action: "dismiss" | "confirm_duplicate") => void;
  className?: string;
}

export function DuplicateWarningBanner({
  invoiceId,
  duplicateStatus,
  duplicateGroup,
  onResolved,
  className,
}: DuplicateWarningBannerProps) {
  const [loading, setLoading] = useState<"dismiss" | "confirm" | null>(null);

  // Only show for suspected duplicates
  if (duplicateStatus !== "suspected" || duplicateGroup.length === 0) {
    return null;
  }

  async function handleAction(action: "dismiss" | "confirm_duplicate") {
    setLoading(action === "dismiss" ? "dismiss" : "confirm");
    try {
      await resolveDuplicate(invoiceId, action);
      toast.success(
        action === "dismiss"
          ? "Duplicate warning dismissed"
          : "Invoice marked as duplicate and cancelled"
      );
      onResolved?.(action);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to resolve duplicate";
      toast.error(message);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div
      role="alert"
      className={cn(
        "rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800",
        className
      )}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle
          className="mt-0.5 size-4 shrink-0 text-amber-600"
          aria-hidden="true"
        />
        <div className="flex-1">
          <p className="font-medium">Possible duplicate detected</p>
          <p className="mt-1 text-xs text-amber-700">
            This invoice matches {duplicateGroup.length} existing{" "}
            {duplicateGroup.length === 1 ? "invoice" : "invoices"} with the same
            vendor and invoice number.
          </p>

          {/* Matching invoices */}
          <ul className="mt-2 space-y-1">
            {duplicateGroup.map((member) => (
              <li key={member.id} className="text-xs">
                <Link
                  href={`/invoices/${member.id}`}
                  className="font-medium text-amber-900 underline-offset-2 hover:underline"
                >
                  {member.invoice_number ?? "—"}
                </Link>
                {" — "}
                <span>{member.vendor_name ?? "Unknown"}</span>
                {member.invoice_date && ` — ${formatDate(member.invoice_date)}`}
                {" — "}
                <span>{formatCurrency(member.total_amount)}</span>
                {" — "}
                <span className="capitalize">
                  {formatStatusLabel(member.status)}
                </span>
              </li>
            ))}
          </ul>

          {/* Action buttons */}
          <div className="mt-3 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAction("dismiss")}
              disabled={loading !== null}
              className="h-7 border-amber-300 text-amber-800 hover:bg-amber-100"
            >
              {loading === "dismiss" && (
                <Loader2 className="mr-1 size-3 animate-spin" />
              )}
              Dismiss Warning
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAction("confirm_duplicate")}
              disabled={loading !== null}
              className="h-7 border-red-300 text-red-700 hover:bg-red-50"
            >
              {loading === "confirm" && (
                <Loader2 className="mr-1 size-3 animate-spin" />
              )}
              Mark as Duplicate
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
