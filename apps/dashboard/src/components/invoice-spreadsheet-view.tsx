"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { InvoiceActionsBar } from "@/components/invoice-actions-bar";
import { InvoiceProcessingState } from "@/components/invoice-processing-state";
import { NonInvoiceBanner } from "@/components/non-invoice-banner";
import { DuplicateWarningBanner } from "@/components/duplicate-warning-banner";
import { ValidationErrorsBanner } from "@/components/validation-errors-banner";
import { StatusBadge } from "@/components/ui/status-badge";
import { useInvoicePolling } from "@/hooks/use-invoice-polling";
import { isNonTerminalStatus, formatStatusLabel, statusToVariant } from "@/lib/invoice-status";
import { computeMismatchDetails, parseInvoiceCharges } from "@/lib/mismatch";
import { updateInvoice, saveReviewCorrections } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/format";
import { AlertTriangle, PanelLeft } from "lucide-react";
import type { Invoice, InvoiceWithLineItems, InvoiceLineItem } from "@/types/database";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { DocumentViewer } from "@/components/document-viewer";
import { Button } from "@/components/ui/button";
import {
  SpreadsheetGrid,
  ActionBar,
  SummarySheet,
  CategoriesSheet,
  SpreadsheetTabBar,
} from "./spreadsheet";
import type { SpreadsheetGridHandle, SaveState, TabDef } from "./spreadsheet";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InvoiceSpreadsheetViewProps {
  invoice: InvoiceWithLineItems;
  documentUrl: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseNum(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

// Column config — engine-agnostic (just widths)
const COLUMN_CONFIG: { width: number }[] = [
  { width: 140 },
  { width: 120 },
  { width: 110 },
  { width: 300 },
  { width: 100 },
  { width: 120 },
  { width: 90 },
  { width: 130 },
  { width: 80 },
];

// Column labels as first row of data (row 1), A/B/C headers stay on top
const COLUMN_HEADERS = [
  "Vendor Name", "Invoice Number", "Invoice Date", "Item Description",
  "Item Quantity", "Item Amount ($)", "Tax ($)", "Category", "Account",
];

/** Convert InvoiceWithLineItems → spreadsheet row data. Row 0 = column labels, Row 1+ = data */
function toSpreadsheetData(invoice: InvoiceWithLineItems): (string | number)[][] {
  const v = (val: string | number | null | undefined): string | number => val ?? "";
  const dataRows = invoice.line_items.length === 0
    ? [[
        v(invoice.vendor_name), v(invoice.invoice_number), v(invoice.invoice_date),
        "", "", "", "", "", "",
      ]]
    : invoice.line_items.map((item) => [
        v(invoice.vendor_name),
        v(invoice.invoice_number),
        v(invoice.invoice_date),
        v(item.description),
        v(item.quantity),
        v(item.extended_price),
        v(item.tax_amount),
        v(item.category),
        v(item.account),
      ]);
  return [COLUMN_HEADERS, ...dataRows];
}

/** Read spreadsheet data → { invoiceUpdates, lineItems } */
function fromSpreadsheetData(
  data: unknown[][],
  invoiceId: string,
  existingItems: InvoiceLineItem[],
): { invoiceUpdates: Partial<Invoice>; lineItems: InvoiceLineItem[] } {
  // Skip row 0 (column headers), invoice-level fields from first data row (row 1)
  const dataRows = data.slice(1);
  const invoiceUpdates: Partial<Invoice> = {
    vendor_name: (dataRows[0]?.[0] as string) || null,
    invoice_number: (dataRows[0]?.[1] as string) || null,
    invoice_date: (dataRows[0]?.[2] as string) || null,
  };

  // Map rows back to line items, preserving existing item mapping by original index.
  // Empty rows get null'd out and filtered after mapping to keep indices aligned.
  const lineItems: InvoiceLineItem[] = dataRows
    .map((row, i) => {
      const hasLineData = row.some((cell, colIdx) => colIdx >= 3 && cell != null && cell !== "");
      if (!hasLineData) return null;
      const existing = existingItems[i];
      return {
        id: existing?.id ?? `new-${Date.now()}-${i}`,
        invoice_id: invoiceId,
        sort_order: i + 1,
        quantity: parseNum(row[4]),
        size: existing?.size ?? null,
        unit: existing?.unit ?? null,
        description: (row[3] as string) || null,
        item_code: existing?.item_code ?? null,
        unit_price: existing?.unit_price ?? null,
        extended_price: parseNum(row[5]),
        tax_amount: parseNum(row[6]),
        category: (row[7] as string) || null,
        account: parseNum(row[8]),
        sub_account: existing?.sub_account ?? null,
        extra: existing?.extra ?? {},
        created_at: existing?.created_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    })
    .filter((item): item is InvoiceLineItem => item !== null)
    .map((item, i) => ({ ...item, sort_order: i + 1 })); // Renumber after filter

  return { invoiceUpdates, lineItems };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InvoiceSpreadsheetView({
  invoice: initialInvoice,
  documentUrl,
}: InvoiceSpreadsheetViewProps) {
  const router = useRouter();
  const [invoice, setInvoice] = useState<InvoiceWithLineItems>(initialInvoice);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activeCell, setActiveCell] = useState({ col: 0, row: 0, value: "" });

  // Dynamic tabs
  const ALL_TABS: TabDef[] = useMemo(() => [
    { id: "items", label: "Items", closable: false },
    { id: "categories", label: "Categories", closable: true },
    { id: "summary", label: "Summary", closable: true },
  ], []);
  const [openTabs, setOpenTabs] = useState(["items", "categories", "summary"]);
  const [activeTab, setActiveTab] = useState("items");

  // PDF split
  const [showPdf, setShowPdf] = useState(false);

  const baselineRef = useRef(initialInvoice);
  const invoiceRef = useRef(invoice);
  useEffect(() => { invoiceRef.current = invoice; }, [invoice]);

  const MAX_UNDO = 50;
  const [undoStack, setUndoStack] = useState<InvoiceWithLineItems[]>([]);
  const [redoStack, setRedoStack] = useState<InvoiceWithLineItems[]>([]);

  // SpreadsheetGrid ref
  const gridRef = useRef<SpreadsheetGridHandle>(null);

  // Polling
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

  // ---------------------------------------------------------------------------
  // Spreadsheet ↔ state sync
  // ---------------------------------------------------------------------------

  // Debounce sync to avoid pushing an undo entry on every keystroke.
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preEditSnapshotRef = useRef<InvoiceWithLineItems | null>(null);

  const syncFromSpreadsheet = useCallback(() => {
    const grid = gridRef.current;
    if (!grid) return;

    // Capture the pre-edit state for undo (only once per edit burst)
    if (!preEditSnapshotRef.current) {
      preEditSnapshotRef.current = invoiceRef.current;
    }

    // Clear previous debounce
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);

    // Debounce: apply the change after 300ms of no further edits
    syncTimerRef.current = setTimeout(() => {
      const gridNow = gridRef.current;
      if (!gridNow) return;
      const data = gridNow.getData() as unknown[][];
      const { invoiceUpdates, lineItems } = fromSpreadsheetData(
        data, invoice.id, invoiceRef.current.line_items
      );

      const snapshot = preEditSnapshotRef.current;
      preEditSnapshotRef.current = null;

      setInvoice((prev) => {
        if (snapshot) {
          setUndoStack((stack) => [...stack, snapshot].slice(-MAX_UNDO));
          setRedoStack([]);
        }
        setSaveState("dirty");
        setSaveError(null);
        return { ...prev, ...invoiceUpdates, line_items: lineItems };
      });
    }, 300);
  }, [invoice.id]);

  // Clean up debounce timer
  useEffect(() => {
    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Undo / Redo / Reset / Save
  // ---------------------------------------------------------------------------

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

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
      await updateInvoice(invoice.id, payload);
      setSaveState("saved");
      const orig = baselineRef.current; // Capture BEFORE updating baseline
      baselineRef.current = invoice;
      setUndoStack([]);
      setRedoStack([]);
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
      }).catch(() => {});
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed";
      setSaveError(message);
      setSaveState("error");
    }
  }, [invoice, saveState]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        void handleSave();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          // Only handle undo if focus is NOT inside the spreadsheet
          // (jspreadsheet handles its own cell-level undo)
          const active = document.activeElement;
          const container = gridRef.current?.getContainer();
          const inGrid = container?.contains(active);
          if (!inGrid) {
            e.preventDefault();
            handleUndo();
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSave, handleUndo, handleRedo]);

  // ---------------------------------------------------------------------------
  // Action handlers (reused from review-client)
  // ---------------------------------------------------------------------------

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
        setInvoice((prev) => ({ ...prev, status: "cancelled", duplicate_status: "confirmed_duplicate" }));
      } else {
        setInvoice((prev) => ({ ...prev, duplicate_status: "dismissed" }));
      }
    },
    []
  );

  const handleDuplicateCheck = useCallback(() => {}, []);

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  const liveErrorMessage = useMemo(() => {
    if (!invoice.error_message) return null;
    const errors = invoice.error_message.split(";").map((e) => e.trim()).filter(Boolean);
    const remaining = errors.filter((error) => {
      if (error === "Missing invoice field: number") return !invoice.invoice_number;
      if (error === "Missing invoice field: date") return !invoice.invoice_date;
      if (error === "Missing invoice field: total") return invoice.total_amount == null;
      if (error === "Missing vendor field: name") return !invoice.vendor_name;
      const m = error.match(/^Line item (\d+): missing description$/);
      if (m) { const idx = parseInt(m[1], 10) - 1; return !invoice.line_items[idx]?.description; }
      return true;
    });
    return remaining.length > 0 ? remaining.join("; ") : null;
  }, [invoice.error_message, invoice.invoice_number, invoice.invoice_date, invoice.total_amount, invoice.vendor_name, invoice.line_items]);

  const showNonInvoiceBanner = invoice.is_non_invoice &&
    !(invoice.metadata as Record<string, unknown>)?.non_invoice_override;

  const showDuplicateBanner =
    invoice.duplicate_status === "suspected" && !!invoice.duplicate_group;

  const invoiceCharges = useMemo(() => parseInvoiceCharges(invoice.metadata), [invoice.metadata]);
  const totalMismatch = useMemo(
    () => computeMismatchDetails(invoice.total_amount, invoice.line_items, invoiceCharges),
    [invoice.total_amount, invoice.line_items, invoiceCharges]
  );

  // Formula bar handlers
  const handleFormulaBarChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setActiveCell((prev) => ({ ...prev, value: e.target.value }));
  }, []);

  const applyFormulaBarValue = useCallback(() => {
    const grid = gridRef.current;
    if (!grid) return;
    // Don't allow editing the header row (row 0)
    if (activeCell.row === 0) return;
    grid.setCellValue(activeCell.col, activeCell.row, activeCell.value);
    // Sync change to parent state
    requestAnimationFrame(() => syncFromSpreadsheet());
  }, [activeCell, syncFromSpreadsheet]);

  const handleFormulaBarKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      applyFormulaBarValue();
      gridRef.current?.focusGrid();
    } else if (e.key === "Escape") {
      // Revert to the cell's current value
      const grid = gridRef.current;
      if (grid) {
        const value = grid.getCellValue(activeCell.col, activeCell.row, false);
        setActiveCell((prev) => ({ ...prev, value: value ?? "" }));
      }
      gridRef.current?.focusGrid();
    }
  }, [activeCell, applyFormulaBarValue]);

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    const grid = gridRef.current;
    if (!grid) return;

    if (!query) {
      grid.clearSearchHighlights();
      return;
    }

    const match = grid.searchCells(query);
    if (match) {
      const value = grid.getCellValue(match.col, match.row);
      setActiveCell({ col: match.col, row: match.row, value: value ?? "" });
    }
  }, []);

  // Tab handlers
  const handleCloseTab = useCallback((id: string) => {
    setOpenTabs((prev) => prev.filter((t) => t !== id));
    setActiveTab((current) => current === id ? "items" : current);
  }, []);

  const handleReopenTab = useCallback((id: string) => {
    setOpenTabs((prev) => [...prev, id]);
    setActiveTab(id);
  }, []);

  // Spreadsheet data (memoized to avoid unnecessary re-renders of SpreadsheetGrid)
  const spreadsheetData = useMemo(() => toSpreadsheetData(invoice), [invoice]);

  const handleSelectionChange = useCallback((col: number, row: number, rawValue: string) => {
    setActiveCell({ col, row, value: rawValue });
  }, []);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-3 overflow-hidden h-[calc(100dvh-64px-2rem)] sm:h-[calc(100dvh-64px-3rem)] lg:h-[calc(100dvh-64px-4rem)]">
      {/* Page Header — invoice title + status + action buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-lg font-semibold text-foreground truncate">
            {invoice.invoice_number
              ? `Invoice #${invoice.invoice_number}`
              : invoice.original_filename}
            {invoice.vendor_name && ` - ${invoice.vendor_name}`}
            {invoice.invoice_date && ` - ${formatDate(invoice.invoice_date)}`}
          </h1>
          <StatusBadge variant={statusToVariant(invoice.status)}>
            {formatStatusLabel(invoice.status)}
          </StatusBadge>
          {invoice.duplicate_status === "suspected" && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 shrink-0">
              <AlertTriangle className="size-3" aria-hidden="true" />
              Dup
            </span>
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
          documentUrl={documentUrl}
        />
      </div>

      {/* Banners — between title and card */}
      {!isProcessing && (showNonInvoiceBanner || showDuplicateBanner || liveErrorMessage || totalMismatch) && (
        <div className="flex flex-col gap-2">
          {showDuplicateBanner && invoice.duplicate_group && (
            <DuplicateWarningBanner
              invoiceId={invoice.id}
              duplicateStatus={invoice.duplicate_status}
              duplicateGroup={invoice.duplicate_group}
              onResolved={handleDuplicateResolved}
            />
          )}
          {showNonInvoiceBanner && (
            <NonInvoiceBanner
              invoiceId={invoice.id}
              documentType={
                ((invoice.metadata as Record<string, unknown>)?.document_type as string) ?? "unknown"
              }
              onOverride={() => {
                setInvoice((prev) => ({
                  ...prev,
                  is_non_invoice: false,
                  metadata: { ...prev.metadata, non_invoice_override: true },
                }));
              }}
            />
          )}
          {liveErrorMessage && <ValidationErrorsBanner errorMessage={liveErrorMessage} />}
          {totalMismatch && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Total mismatch: expected {formatCurrency(totalMismatch.expectedTotal)}, computed {formatCurrency(totalMismatch.computedTotal)}
            </div>
          )}
        </div>
      )}

      {/* Card — spreadsheet section only */}
      {isProcessing ? (
        <div className="flex-1 flex items-center justify-center rounded-xl border border-border/70 bg-card/60 shadow-sm p-8">
          <InvoiceProcessingState
            status={pollingState.status}
            progress={pollingState.progress}
            processingStage={pollingState.processingStage}
            errorMessage={pollingState.errorMessage}
            uploadedAt={invoice.uploaded_at}
          />
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-border/70 bg-white shadow-sm overflow-hidden">
          {showPdf && documentUrl ? (
            <ResizablePanelGroup orientation="horizontal" className="flex-1 min-h-0">
              <ResizablePanel defaultSize={40} minSize={20}>
                <div className="h-full overflow-auto bg-muted/30">
                  <DocumentViewer documentUrl={documentUrl} documentKind="pdf" />
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={60} minSize={30}>
                <div className="flex flex-col h-full">
                  {/* Tab bar + PDF toggle */}
                  <div className="flex items-end px-1 bg-[#f9fbfd] border-b border-[#e0e0e0]">
                    <SpreadsheetTabBar
                      tabs={ALL_TABS}
                      openTabs={openTabs}
                      activeTab={activeTab}
                      onActivate={setActiveTab}
                      onClose={handleCloseTab}
                      onReopen={handleReopenTab}
                    />
                    <div className="flex-1" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] px-2 mr-1 mb-0.5 text-[#636363]"
                      onClick={() => setShowPdf(false)}
                      title="Hide PDF preview"
                    >
                      <PanelLeft className="size-3" />
                      Hide PDF
                    </Button>
                  </div>
                  {/* Tab content */}
                  <div className={activeTab === "items" ? "flex flex-col flex-1 min-h-0" : "hidden"}>
                    <ActionBar
                      activeCell={activeCell}
                      onFormulaChange={handleFormulaBarChange}
                      onFormulaKeyDown={handleFormulaBarKeyDown}
                      searchQuery={searchQuery}
                      onSearchChange={handleSearchChange}
                      saveState={saveState}
                      saveError={saveError}
                      canUndo={canUndo}
                      canRedo={canRedo}
                      onSave={() => void handleSave()}
                      onUndo={handleUndo}
                      onRedo={handleRedo}
                      onReset={handleReset}
                    />
                    <SpreadsheetGrid
                      ref={gridRef}
                      data={spreadsheetData}
                      columns={COLUMN_CONFIG}
                      columnHeaders={COLUMN_HEADERS}
                      minRows={invoice.line_items.length}
                      enabled={!isProcessing}
                      onDataChange={syncFromSpreadsheet}
                      onSelectionChange={handleSelectionChange}
                    />
                  </div>
                  {activeTab === "summary" && (
                    <SummarySheet invoice={invoice} invoiceCharges={invoiceCharges} totalMismatch={totalMismatch} />
                  )}
                  {activeTab === "categories" && (
                    <CategoriesSheet invoice={invoice} />
                  )}
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          ) : (
            <>
              {/* Tab bar + PDF toggle */}
              <div className="flex items-end px-1 bg-[#f9fbfd] border-b border-[#e0e0e0]">
                <SpreadsheetTabBar
                  tabs={ALL_TABS}
                  openTabs={openTabs}
                  activeTab={activeTab}
                  onActivate={setActiveTab}
                  onClose={handleCloseTab}
                  onReopen={handleReopenTab}
                />
                <div className="flex-1" />
                {documentUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] px-2 mr-1 mb-0.5 text-[#636363]"
                    onClick={() => setShowPdf(true)}
                    title="Show PDF preview"
                  >
                    <PanelLeft className="size-3" />
                    Show PDF
                  </Button>
                )}
              </div>
              {/* Tab content */}
              <div className={activeTab === "items" ? "flex flex-col flex-1 min-h-0" : "hidden"}>
                <ActionBar
                  activeCell={activeCell}
                  onFormulaChange={handleFormulaBarChange}
                  onFormulaKeyDown={handleFormulaBarKeyDown}
                  searchQuery={searchQuery}
                  onSearchChange={handleSearchChange}
                  saveState={saveState}
                  saveError={saveError}
                  canUndo={canUndo}
                  canRedo={canRedo}
                  onSave={() => void handleSave()}
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                  onReset={handleReset}
                />
                <SpreadsheetGrid
                  ref={gridRef}
                  data={spreadsheetData}
                  columns={COLUMN_CONFIG}
                  columnHeaders={COLUMN_HEADERS}
                  minRows={invoice.line_items.length}
                  enabled={!isProcessing}
                  onDataChange={syncFromSpreadsheet}
                  onSelectionChange={handleSelectionChange}
                />
              </div>
              {activeTab === "summary" && (
                <SummarySheet invoice={invoice} invoiceCharges={invoiceCharges} totalMismatch={totalMismatch} />
              )}
              {activeTab === "categories" && (
                <CategoriesSheet invoice={invoice} />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
