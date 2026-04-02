"use client";

import { formatCurrency, formatDate } from "@/lib/format";
import type { InvoiceWithLineItems } from "@/types/database";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SummarySheetProps {
  invoice: InvoiceWithLineItems;
  invoiceCharges: {
    tax: number;
    freight: number;
    shipping: number;
    discount: number;
  };
  totalMismatch: {
    expectedTotal: number;
    computedTotal: number;
  } | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SummarySheet({
  invoice,
  invoiceCharges,
  totalMismatch,
}: SummarySheetProps) {
  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-lg space-y-4">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
          Invoice Summary
        </h3>
        <div className="rounded-lg border border-border/50 divide-y divide-border/50">
          <div className="flex justify-between px-4 py-2.5 text-sm">
            <span className="text-muted-foreground">Vendor</span>
            <span className="font-medium">{invoice.vendor_name ?? "—"}</span>
          </div>
          <div className="flex justify-between px-4 py-2.5 text-sm">
            <span className="text-muted-foreground">Invoice Number</span>
            <span className="font-medium">
              {invoice.invoice_number ?? "—"}
            </span>
          </div>
          <div className="flex justify-between px-4 py-2.5 text-sm">
            <span className="text-muted-foreground">Invoice Date</span>
            <span className="font-medium">
              {invoice.invoice_date
                ? formatDate(invoice.invoice_date)
                : "—"}
            </span>
          </div>
          <div className="flex justify-between px-4 py-2.5 text-sm">
            <span className="text-muted-foreground">Line Items</span>
            <span className="font-medium">{invoice.line_items.length}</span>
          </div>
          <div className="flex justify-between px-4 py-2.5 text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">
              {formatCurrency(
                invoice.line_items.reduce(
                  (s, li) => s + (li.extended_price ?? 0),
                  0,
                ),
              )}
            </span>
          </div>
          {invoiceCharges.tax > 0 && (
            <div className="flex justify-between px-4 py-2.5 text-sm">
              <span className="text-muted-foreground">Tax</span>
              <span className="font-medium">
                {formatCurrency(invoiceCharges.tax)}
              </span>
            </div>
          )}
          {invoiceCharges.freight > 0 && (
            <div className="flex justify-between px-4 py-2.5 text-sm">
              <span className="text-muted-foreground">Freight</span>
              <span className="font-medium">
                {formatCurrency(invoiceCharges.freight)}
              </span>
            </div>
          )}
          {invoiceCharges.shipping > 0 && (
            <div className="flex justify-between px-4 py-2.5 text-sm">
              <span className="text-muted-foreground">Shipping</span>
              <span className="font-medium">
                {formatCurrency(invoiceCharges.shipping)}
              </span>
            </div>
          )}
          {invoiceCharges.discount > 0 && (
            <div className="flex justify-between px-4 py-2.5 text-sm">
              <span className="text-muted-foreground">Discount</span>
              <span className="font-medium text-emerald-600">
                -{formatCurrency(invoiceCharges.discount)}
              </span>
            </div>
          )}
          <div className="flex justify-between px-4 py-3 text-sm font-semibold bg-muted/20">
            <span>Total</span>
            <span>{formatCurrency(invoice.total_amount)}</span>
          </div>
        </div>
        {totalMismatch && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Computed total ({formatCurrency(totalMismatch.computedTotal)}) does
            not match invoice total (
            {formatCurrency(totalMismatch.expectedTotal)})
          </div>
        )}
      </div>
    </div>
  );
}
