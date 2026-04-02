import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";

export interface TotalMismatchBannerProps {
  expectedTotal: number;
  computedTotal: number;
  extractionConfidence?: string;
  className?: string;
}

export function TotalMismatchBanner({
  expectedTotal,
  computedTotal,
  extractionConfidence,
  className,
}: TotalMismatchBannerProps) {
  const difference = Math.round((expectedTotal - computedTotal) * 100) / 100;
  const isLowConfidence =
    extractionConfidence === "low" || extractionConfidence === "medium";

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
        <div>
          <p className="font-medium">Total mismatch</p>
          <p className="mt-1 text-xs text-amber-700">
            Invoice total is{" "}
            <span className="font-semibold">{formatCurrency(expectedTotal)}</span>{" "}
            but computed total is{" "}
            <span className="font-semibold">{formatCurrency(computedTotal)}</span>.
            Difference:{" "}
            <span className="font-semibold">{formatCurrency(difference)}</span>.
          </p>
          {isLowConfidence ? (
            <p className="mt-1 text-xs font-medium text-amber-700">
              Values may be inaccurate &mdash; please verify against the original
              invoice.
            </p>
          ) : (
            <p className="mt-1 text-xs text-amber-600">
              This warning will resolve automatically when totals match.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
