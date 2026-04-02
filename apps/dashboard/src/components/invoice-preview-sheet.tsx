"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, ExternalLink } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";
import { formatStatusLabel, statusToVariant } from "@/lib/invoice-status";
import type { InvoiceWithLineItems } from "@/types/database";

interface InvoicePreviewSheetProps {
  invoiceId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvoicePreviewSheet({
  invoiceId,
  open,
  onOpenChange,
}: InvoicePreviewSheetProps) {
  type FetchState =
    | { status: "idle" }
    | { status: "loading" }
    | { status: "success"; data: InvoiceWithLineItems }
    | { status: "error"; message: string };

  const [fetchState, setFetchState] = useState<FetchState>({ status: "idle" });

  useEffect(() => {
    if (!invoiceId || !open) return;

    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: show loading immediately when starting fetch
    setFetchState({ status: "loading" });

    fetch(`/api/invoices/${invoiceId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load invoice (${res.status})`);
        return res.json();
      })
      .then((data: InvoiceWithLineItems) => {
        if (!cancelled) setFetchState({ status: "success", data });
      })
      .catch((err: Error) => {
        if (!cancelled) setFetchState({ status: "error", message: err.message });
      });

    return () => {
      cancelled = true;
    };
  }, [invoiceId, open]);

  const isLoading = fetchState.status === "loading";
  const error = fetchState.status === "error" ? fetchState.message : null;
  const invoice = fetchState.status === "success" ? fetchState.data : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] sm:max-w-[400px] overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="py-8 text-center">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {invoice && !isLoading && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                {invoice.invoice_number
                  ? `#${invoice.invoice_number}`
                  : invoice.original_filename}
                <StatusBadge variant={statusToVariant(invoice.status)}>
                  {formatStatusLabel(invoice.status)}
                </StatusBadge>
              </SheetTitle>
              <SheetDescription>
                {invoice.vendor_name ?? "Unknown vendor"}
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-4 pt-4">
              {/* Key details */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-medium">{formatDate(invoice.invoice_date)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total</p>
                  <p className="font-medium">{formatCurrency(invoice.total_amount)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Line Items</p>
                  <p className="font-medium">{invoice.line_items.length}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Source</p>
                  <p className="font-medium capitalize">{invoice.source.replace("_", " ")}</p>
                </div>
              </div>

              {/* Line items summary */}
              {invoice.line_items.length > 0 && (
                <div className="rounded-md border border-border/70 bg-muted/20">
                  <div className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground border-b border-border/40">
                    Items
                  </div>
                  <div className="max-h-[200px] overflow-y-auto">
                    {invoice.line_items.slice(0, 10).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between border-b border-border/20 px-3 py-1.5 text-sm last:border-0"
                      >
                        <span className="truncate text-muted-foreground">
                          {item.description ?? "—"}
                        </span>
                        <span className="ml-2 shrink-0 font-medium">
                          {formatCurrency(item.extended_price)}
                        </span>
                      </div>
                    ))}
                    {invoice.line_items.length > 10 && (
                      <div className="px-3 py-1.5 text-xs text-muted-foreground">
                        +{invoice.line_items.length - 10} more items
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* View full invoice link */}
              <Button asChild variant="outline" className="w-full">
                <Link href={`/invoices/${invoice.id}`}>
                  <ExternalLink className="size-4" />
                  View Full Invoice
                </Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
