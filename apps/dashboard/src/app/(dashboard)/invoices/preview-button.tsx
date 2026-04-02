"use client";

import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInvoicePreview } from "./invoices-table-client";

export function PreviewButton({ invoiceId }: { invoiceId: string }) {
  const openPreview = useInvoicePreview();

  return (
    <Button
      variant="ghost"
      size="icon-xs"
      onClick={() => openPreview(invoiceId)}
      aria-label="Preview invoice"
      className="text-muted-foreground/50 hover:text-foreground"
    >
      <Eye className="size-3.5" />
    </Button>
  );
}
