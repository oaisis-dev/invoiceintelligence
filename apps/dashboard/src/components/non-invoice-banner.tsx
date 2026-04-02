"use client";

import { useState } from "react";
import { FileWarning, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { updateInvoice } from "@/lib/api-client";
import { toast } from "sonner";

export interface NonInvoiceBannerProps {
  invoiceId: string;
  documentType: string;
  onOverride?: () => void;
  className?: string;
}

export function NonInvoiceBanner({
  invoiceId,
  documentType,
  onOverride,
  className,
}: NonInvoiceBannerProps) {
  const [loading, setLoading] = useState(false);

  async function handleOverride() {
    setLoading(true);
    try {
      await updateInvoice(invoiceId, {
        metadata: { non_invoice_override: true },
      });
      toast.success("Document accepted as invoice");
      onOverride?.();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Override failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  const typeLabel = documentType.replace(/_/g, " ");

  return (
    <div
      role="alert"
      className={cn(
        "rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800",
        className
      )}
    >
      <div className="flex items-start gap-2">
        <FileWarning
          className="mt-0.5 size-4 shrink-0 text-orange-600"
          aria-hidden="true"
        />
        <div className="flex-1">
          <p className="font-medium">This document doesn&apos;t appear to be an invoice</p>
          <p className="mt-1 text-xs text-orange-700">
            This document was detected as a <strong>{typeLabel}</strong>.
            If this is actually an invoice, you can override this detection and
            manually enter the invoice data.
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleOverride}
              disabled={loading}
              className="h-7 border-orange-300 text-orange-800 hover:bg-orange-100"
            >
              {loading && (
                <Loader2 className="mr-1 size-3 animate-spin" />
              )}
              Keep as Invoice
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
