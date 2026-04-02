"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { InvoiceDetailTabs } from "@/components/invoice-detail-tabs";
import { InvoiceActionsBar } from "@/components/invoice-actions-bar";
import { InvoiceProcessingState } from "@/components/invoice-processing-state";
import { NonInvoiceBanner } from "@/components/non-invoice-banner";
import { ValidationErrorsBanner } from "@/components/validation-errors-banner";
import { useInvoicePolling } from "@/hooks/use-invoice-polling";
import { isNonTerminalStatus } from "@/lib/invoice-status";
import { computeMismatchDetails, parseInvoiceCharges } from "@/lib/mismatch";
import { updateInvoice, saveReviewCorrections } from "@/lib/api-client";
import { Loader2, Save, Undo2, Redo2, RotateCcw, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Invoice, InvoiceWithLineItems, InvoiceLineItem } from "@/types/database";

interface InvoiceReviewClientProps {
  invoice: InvoiceWithLineItems;
  documentUrl: string | null;
}

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

export function InvoiceReviewClient({
  invoice: initialInvoice,
  documentUrl,
}: InvoiceReviewClientProps) {
  const router = useRouter();
  const [invoice, setInvoice] = useState<InvoiceWithLineItems>(initialInvoice);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  // Baseline = last-saved state. Used for reset and correction detection.
  // Updated after each successful save.
  const baselineRef = useRef(initialInvoice);
  const invoiceRef = useRef(invoice);
  useEffect(() => { invoiceRef.current = invoice; }, [invoice]);

  // Undo/redo history (capped to avoid unbounded memory growth)
  const MAX_UNDO = 50;
  const [undoStack, setUndoStack] = useState<InvoiceWithLineItems[]>([]);
  const [redoStack, setRedoStack] = useState<InvoiceWithLineItems[]>([]);

  // Poll for status updates while invoice is being processed
  const pollingState = useInvoicePolling(
    invoice.id,
    invoice.status,
    invoice.progress,
    invoice.processing_stage,
    invoice.error_message,
    () => router.refresh()
  );

  const isProcessing =
    isNonTerminalStatus(pollingState.status) || pollingState.status === "failed";

  // --- Edit helpers (push to undo stack) ---

  const applyChange = useCallback(
    (updater: (prev: InvoiceWithLineItems) => InvoiceWithLineItems) => {
      setInvoice((prev) => {
        setUndoStack((stack) => [...stack, prev].slice(-MAX_UNDO));
        setRedoStack([]);
        setSaveState("dirty");
        setSaveError(null);
        return updater(prev);
      });
    },
    []
  );

  const handleMetadataChange = useCallback(
    (updates: Partial<Invoice>) => {
      applyChange((prev) => ({ ...prev, ...updates }));
    },
    [applyChange]
  );

  const handleLineItemsChange = useCallback(
    (items: InvoiceLineItem[]) => {
      applyChange((prev) => ({ ...prev, line_items: items }));
    },
    [applyChange]
  );

  // --- Undo / Redo / Reset ---

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;
  const isDirty = saveState === "dirty";

  const handleUndo = useCallback(() => {
    if (!canUndo) return;
    setUndoStack((stack) => {
      const prev = stack[stack.length - 1]!;
      setRedoStack((redo) => [...redo, invoiceRef.current]);
      setInvoice(prev);
      setSaveState("dirty");
      return stack.slice(0, -1);
    });
  }, [canUndo]);

  const handleRedo = useCallback(() => {
    if (!canRedo) return;
    setRedoStack((stack) => {
      const next = stack[stack.length - 1]!;
      setUndoStack((undo) => [...undo, invoiceRef.current]);
      setInvoice(next);
      setSaveState("dirty");
      return stack.slice(0, -1);
    });
  }, [canRedo]);

  const handleReset = useCallback(() => {
    const baseline = baselineRef.current;
    setUndoStack((stack) => [...stack, invoiceRef.current]);
    setRedoStack([]);
    setInvoice(baseline);
    setSaveState("idle");
    setSaveError(null);
  }, []);

  // --- Save ---

  const handleSave = useCallback(async () => {
    if (saveState !== "dirty") return;
    setSaveState("saving");
    setSaveError(null);

    const payload: Partial<Invoice> & { line_items: InvoiceLineItem[] } = {
      vendor_name: invoice.vendor_name,
      invoice_number: invoice.invoice_number,
      invoice_date: invoice.invoice_date,
      total_amount: invoice.total_amount,
      metadata: {
        ...(invoice.metadata ?? {}),
        line_items_edited: true,
      },
      line_items: invoice.line_items,
    };

    try {
      const updated = await updateInvoice(invoice.id, payload);
      const updatedWithItems = updated as Invoice & { line_items?: InvoiceLineItem[] };
      setInvoice((prev) => ({
        ...prev,
        ...updated,
        line_items: updatedWithItems.line_items ?? prev.line_items,
      }));
      setSaveState("saved");
      // Saved state becomes the new baseline for reset and correction detection
      baselineRef.current = invoice;
      setUndoStack([]);
      setRedoStack([]);

      // Fire correction detection in the background (non-blocking)
      const orig = baselineRef.current;
      saveReviewCorrections(invoice.id, {
        vendor_name: invoice.vendor_name ?? null,
        original: {
          line_items: orig.line_items.map((li) => ({
            id: li.id,
            category: li.category,
            description: li.description,
          })),
        },
        corrected: {
          line_items: invoice.line_items.map((li) => ({
            id: li.id,
            category: li.category,
            description: li.description,
          })),
        },
      }).catch(() => {
        // Correction detection is best-effort
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed";
      setSaveError(message);
      setSaveState("error");
    }
  }, [invoice, saveState]);

  // Ctrl+S / Cmd+S manual trigger
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        void handleSave();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSave, handleUndo, handleRedo]);

  // --- Action handlers ---

  const handleApprove = useCallback(() => {
    setInvoice((prev) => ({ ...prev, status: "approved" }));
  }, []);

  const handleExport = useCallback(() => {
    setInvoice((prev) => ({ ...prev, status: "exported" }));
  }, []);

  const handleReject = useCallback(() => {
    setInvoice((prev) => ({ ...prev, status: "cancelled" }));
    router.push("/invoices");
  }, [router]);

  const handleDelete = useCallback(() => {
    router.push("/invoices");
  }, [router]);

  const handleRetry = useCallback(() => {
    setInvoice((prev) => ({
      ...prev,
      status: "queued",
      error_message: null,
      progress: 0,
      line_items: [],
    }));
  }, []);

  const handleDuplicateResolved = useCallback(
    (action: "dismiss" | "confirm_duplicate") => {
      if (action === "confirm_duplicate") {
        setInvoice((prev) => ({
          ...prev,
          status: "cancelled",
          duplicate_status: "confirmed_duplicate",
        }));
      } else {
        setInvoice((prev) => ({
          ...prev,
          duplicate_status: "dismissed",
        }));
      }
    },
    []
  );

  const handleDuplicateCheck = useCallback(() => {}, []);

  // --- Derived state ---

  const liveErrorMessage = useMemo(() => {
    if (!invoice.error_message) return null;

    const errors = invoice.error_message
      .split(";")
      .map((e) => e.trim())
      .filter(Boolean);

    const remaining = errors.filter((error) => {
      if (error === "Missing invoice field: number") return !invoice.invoice_number;
      if (error === "Missing invoice field: date") return !invoice.invoice_date;
      if (error === "Missing invoice field: total") return invoice.total_amount == null;
      if (error === "Missing vendor field: name") return !invoice.vendor_name;

      const lineItemMatch = error.match(/^Line item (\d+): missing description$/);
      if (lineItemMatch) {
        const idx = parseInt(lineItemMatch[1], 10) - 1;
        const item = invoice.line_items[idx];
        return !item?.description;
      }

      return true;
    });

    return remaining.length > 0 ? remaining.join("; ") : null;
  }, [invoice.error_message, invoice.invoice_number, invoice.invoice_date, invoice.total_amount, invoice.vendor_name, invoice.line_items]);

  const invoiceCharges = useMemo(
    () => parseInvoiceCharges(invoice.metadata),
    [invoice.metadata]
  );

  const totalMismatch = useMemo(
    () => computeMismatchDetails(invoice.total_amount, invoice.line_items, invoiceCharges),
    [invoice.total_amount, invoice.line_items, invoiceCharges]
  );

  const extractionConfidence = useMemo(() => {
    const meta = invoice.metadata as Record<string, unknown> | null;
    if (!meta) return null;
    const confidence = meta.extraction_confidence as "high" | "medium" | "low" | undefined;
    const warnings = (meta.extraction_warnings ?? []) as string[];
    if (!confidence && warnings.length === 0) return null;
    if (confidence === "high" && warnings.length === 0) return null;
    return { confidence: confidence ?? "medium", warnings };
  }, [invoice.metadata]);

  return (
    <>
      {/* Toolbar: save, undo/redo, reset, PDF link, actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {!isProcessing && (
            <>
              {/* Save */}
              <Button
                size="sm"
                onClick={() => void handleSave()}
                disabled={saveState !== "dirty" && saveState !== "error"}
              >
                {saveState === "saving" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Save className="size-3.5" />
                )}
                {saveState === "saving" ? "Saving..." : "Save"}
              </Button>

              {/* Undo */}
              <Button
                variant="outline"
                size="icon-xs"
                onClick={handleUndo}
                disabled={!canUndo}
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="size-3.5" />
              </Button>

              {/* Redo */}
              <Button
                variant="outline"
                size="icon-xs"
                onClick={handleRedo}
                disabled={!canRedo}
                title="Redo (Ctrl+Shift+Z)"
              >
                <Redo2 className="size-3.5" />
              </Button>

              {/* Reset */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={!isDirty && !canUndo}
                title="Reset to original"
              >
                <RotateCcw className="size-3.5" />
                Reset
              </Button>

              {/* Save status */}
              <span className="text-xs text-muted-foreground">
                {saveState === "saved" && "Saved"}
                {saveState === "error" && (
                  <span className="text-destructive">
                    {saveError ? `Error: ${saveError}` : "Save failed"}
                  </span>
                )}
              </span>
            </>
          )}

          {/* Open PDF in new tab */}
          {documentUrl && !isProcessing && (
            <Button variant="outline" size="sm" asChild>
              <a href={documentUrl} target="_blank" rel="noopener noreferrer">
                <FileText className="size-3.5" />
                View PDF
              </a>
            </Button>
          )}
        </div>

        <InvoiceActionsBar
          invoice={invoice}
          onApprove={handleApprove}
          onExport={handleExport}
          onReject={handleReject}
          onRetry={handleRetry}
          onCheckDuplicate={handleDuplicateCheck}
          onDelete={handleDelete}
        />
      </div>

      {/* Critical banners — always visible above tabs when NOT processing */}
      {!isProcessing && (
        <>
          {invoice.is_non_invoice &&
            !(invoice.metadata as Record<string, unknown>)?.non_invoice_override && (
            <NonInvoiceBanner
              invoiceId={invoice.id}
              documentType={
                ((invoice.metadata as Record<string, unknown>)?.document_type as string) ?? "unknown"
              }
              onOverride={() => {
                applyChange((prev) => ({
                  ...prev,
                  is_non_invoice: false,
                  metadata: {
                    ...prev.metadata,
                    non_invoice_override: true,
                  },
                }));
              }}
            />
          )}
          {liveErrorMessage && (
            <ValidationErrorsBanner errorMessage={liveErrorMessage} />
          )}
        </>
      )}

      {/* Main content — full width */}
      {isProcessing ? (
        <InvoiceProcessingState
          status={pollingState.status}
          progress={pollingState.progress}
          processingStage={pollingState.processingStage}
          errorMessage={pollingState.errorMessage}
          uploadedAt={invoice.uploaded_at}
        />
      ) : (
        <InvoiceDetailTabs
          invoice={invoice}
          onMetadataChange={handleMetadataChange}
          onLineItemsChange={handleLineItemsChange}
          onDuplicateResolved={handleDuplicateResolved}
          charges={invoiceCharges}
          totalMismatch={totalMismatch}
          extractionConfidence={extractionConfidence}
        />
      )}
    </>
  );
}
