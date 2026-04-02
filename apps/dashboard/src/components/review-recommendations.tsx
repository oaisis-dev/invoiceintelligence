"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, ChevronDown } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import type { Invoice } from "@/types/database";

interface ReviewRecommendationsProps {
  duplicates: Invoice[];
  mismatches: Invoice[];
  className?: string;
}

/**
 * Expandable amber panel that surfaces invoices needing reviewer attention
 * (suspected duplicates and total amount mismatches).
 *
 * Deduplicates invoices that appear in both lists to avoid showing them twice.
 */
export function ReviewRecommendations({
  duplicates,
  mismatches,
  className,
}: ReviewRecommendationsProps) {
  const [expanded, setExpanded] = useState(false);

  // Deduplicate: if an invoice appears in both lists, keep it in duplicates only
  const duplicateIds = new Set(duplicates.map((d) => d.id));
  const uniqueMismatches = mismatches.filter((m) => !duplicateIds.has(m.id));

  const totalCount = duplicates.length + uniqueMismatches.length;
  if (totalCount === 0) return null;

  return (
    <div
      role="region"
      aria-label="Review recommendations"
      className={cn(
        "rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-start gap-2 text-left"
      >
        <AlertTriangle
          className="mt-0.5 size-4 shrink-0 text-amber-600"
          aria-hidden="true"
        />
        <div className="flex-1">
          <p className="font-medium">
            {totalCount} {totalCount === 1 ? "invoice needs" : "invoices need"}{" "}
            your attention
          </p>
        </div>
        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.15 }}
          className="mt-0.5 shrink-0"
        >
          <ChevronDown className="size-4 text-amber-500" aria-hidden="true" />
        </motion.span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-3 pl-6">
              {duplicates.length > 0 && (
                <Section
                  title={`Suspected Duplicates (${duplicates.length})`}
                  invoices={duplicates}
                />
              )}
              {uniqueMismatches.length > 0 && (
                <Section
                  title={`Total Amount Mismatches (${uniqueMismatches.length})`}
                  invoices={uniqueMismatches}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Section({
  title,
  invoices,
}: {
  title: string;
  invoices: Invoice[];
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
        {title}
      </p>
      <ul className="space-y-1">
        {invoices.map((inv) => (
          <li key={inv.id} className="flex items-center gap-1.5 text-xs">
            <span className="mt-0.5 size-1 shrink-0 rounded-full bg-amber-400" />
            <Link
              href={`/invoices/${inv.id}`}
              className="font-medium underline-offset-2 hover:underline"
            >
              {inv.invoice_number ?? "—"}
            </Link>
            <span className="text-amber-600">—</span>
            <span className="truncate">{inv.vendor_name ?? "Unknown vendor"}</span>
            <span className="ml-auto shrink-0 font-medium">
              {formatCurrency(inv.total_amount)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
