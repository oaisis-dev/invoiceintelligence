"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { InvoicePreviewSheet } from "@/components/invoice-preview-sheet";

const PreviewContext = createContext<((id: string) => void) | null>(null);

export function useInvoicePreview() {
  const ctx = useContext(PreviewContext);
  if (!ctx) throw new Error("useInvoicePreview must be used within InvoicesTableClient");
  return ctx;
}

export function InvoicesTableClient({ children }: { children: React.ReactNode }) {
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const openPreview = useCallback((id: string) => {
    setPreviewId(id);
    setSheetOpen(true);
  }, []);

  return (
    <PreviewContext.Provider value={openPreview}>
      {children}
      <InvoicePreviewSheet
        invoiceId={previewId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </PreviewContext.Provider>
  );
}
