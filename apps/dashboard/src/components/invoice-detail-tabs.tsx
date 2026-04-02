"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { InvoiceMetadataForm } from "@/components/invoice-metadata-form";
import { LineItemsGrid } from "@/components/line-items-grid";
import { InvoiceHistoryTimeline } from "@/components/invoice-history-timeline";
import { DuplicateWarningBanner } from "@/components/duplicate-warning-banner";
import { EmailContextBanner } from "@/components/email-context-banner";
import { ExtractionConfidenceBanner } from "@/components/extraction-confidence-banner";
import { TotalMismatchBanner } from "@/components/total-mismatch-banner";
import type { Invoice, InvoiceWithLineItems, InvoiceLineItem } from "@/types/database";
import type { InvoiceCharges } from "@/lib/mismatch";

interface InvoiceDetailTabsProps {
  invoice: InvoiceWithLineItems;
  onMetadataChange: (updates: Partial<Invoice>) => void;
  onLineItemsChange: (items: InvoiceLineItem[]) => void;
  onDuplicateResolved: (action: "dismiss" | "confirm_duplicate") => void;
  charges?: InvoiceCharges;
  totalMismatch: {
    expectedTotal: number;
    computedTotal: number;
  } | null;
  extractionConfidence: {
    confidence: "high" | "medium" | "low";
    warnings: string[];
  } | null;
}

function getDefaultTab(invoice: InvoiceWithLineItems): string {
  if (invoice.duplicate_status === "suspected") return "duplicates";
  if (invoice.has_total_mismatch) return "line-items";
  return "details";
}

export function InvoiceDetailTabs({
  invoice,
  onMetadataChange,
  onLineItemsChange,
  onDuplicateResolved,
  charges,
  totalMismatch,
  extractionConfidence,
}: InvoiceDetailTabsProps) {
  const [activeTab, setActiveTab] = useState(() => getDefaultTab(invoice));

  const hasDuplicateWarning = invoice.duplicate_status === "suspected";

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col gap-0">
      <TabsList className="w-full justify-start">
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="line-items" className="gap-1.5">
          Line Items
          {invoice.line_items.length > 0 && (
            <span className="rounded-full bg-muted-foreground/20 px-1.5 text-[10px] font-medium">
              {invoice.line_items.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
        <TabsTrigger value="duplicates" className="gap-1.5">
          Duplicates
          {hasDuplicateWarning && (
            <AlertTriangle className="size-3.5 text-amber-500" />
          )}
        </TabsTrigger>
      </TabsList>

      {/* Details tab */}
      <TabsContent value="details" className="mt-4 flex flex-col gap-4">
        {/* Contextual banners for the details view */}
        {invoice.source === "email" && invoice.email_context && (
          <EmailContextBanner
            fromEmail={invoice.email_context.from_email}
            subject={invoice.email_context.subject}
            receivedAt={invoice.email_context.received_at}
          />
        )}
        {extractionConfidence && (
          <ExtractionConfidenceBanner
            confidence={extractionConfidence.confidence}
            warnings={extractionConfidence.warnings}
          />
        )}
        <InvoiceMetadataForm
          invoice={invoice}
          onChange={onMetadataChange}
        />
      </TabsContent>

      {/* Line Items tab */}
      <TabsContent value="line-items" className="mt-4 flex flex-col gap-4">
        {totalMismatch && (
          <TotalMismatchBanner
            expectedTotal={totalMismatch.expectedTotal}
            computedTotal={totalMismatch.computedTotal}
            extractionConfidence={extractionConfidence?.confidence}
          />
        )}
        <LineItemsGrid
          invoiceId={invoice.id}
          lineItems={invoice.line_items}
          onChange={onLineItemsChange}
          charges={charges}
        />
      </TabsContent>

      {/* History tab — lazy-rendered to avoid fetching on initial load */}
      <TabsContent value="history" className="mt-4">
        {activeTab === "history" && (
          <InvoiceHistoryTimeline invoiceId={invoice.id} />
        )}
      </TabsContent>

      {/* Duplicates tab */}
      <TabsContent value="duplicates" className="mt-4">
        {invoice.duplicate_status === "suspected" && invoice.duplicate_group ? (
          <DuplicateWarningBanner
            invoiceId={invoice.id}
            duplicateStatus={invoice.duplicate_status}
            duplicateGroup={invoice.duplicate_group}
            onResolved={onDuplicateResolved}
          />
        ) : (
          <div className="rounded-lg border border-border/70 bg-card/60 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              {invoice.duplicate_status === "dismissed"
                ? "Duplicate was reviewed and dismissed."
                : invoice.duplicate_status === "confirmed_duplicate"
                  ? "This invoice was confirmed as a duplicate."
                  : "No duplicate issues detected."}
            </p>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
