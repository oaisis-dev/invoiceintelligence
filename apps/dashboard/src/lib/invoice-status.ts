import type {
  InvoiceStatus,
  ProcessingStage,
} from "@/types/database";

type BadgeVariant = "success" | "warning" | "error";

export const INVOICE_STATUSES: InvoiceStatus[] = [
  "uploaded",
  "queued",
  "processing",
  "ready_for_review",
  "failed",
  "cancelled",
  "approved",
  "exported",
];

export const statusLabels: Record<InvoiceStatus, string> = {
  uploaded: "Uploaded",
  queued: "Queued",
  processing: "Processing",
  ready_for_review: "Ready for Review",
  failed: "Failed",
  cancelled: "Cancelled",
  approved: "Approved",
  exported: "Exported",
};

export const statusVariants: Record<InvoiceStatus, BadgeVariant> = {
  uploaded: "warning",
  queued: "warning",
  processing: "warning",
  ready_for_review: "success",
  failed: "error",
  cancelled: "error",
  approved: "success",
  exported: "success",
};

const terminalStatuses = new Set<InvoiceStatus>([
  "ready_for_review",
  "failed",
  "cancelled",
  "approved",
  "exported",
]);

export function isTerminalStatus(status: InvoiceStatus): boolean {
  return terminalStatuses.has(status);
}

export function formatStatusLabel(status: InvoiceStatus): string {
  return statusLabels[status] ?? status;
}

export function statusToVariant(status: InvoiceStatus): BadgeVariant {
  return statusVariants[status] ?? "warning";
}

export function isNonTerminalStatus(status: InvoiceStatus): boolean {
  return !isTerminalStatus(status);
}

const stageProgressFallback: Record<ProcessingStage, number> = {
  rotate_pdf: 25,
  ocr: 45,
  extraction: 65,
  verification: 70,
  duplicate_check: 80,
  validation: 90,
  classification: 95,
};

const statusProgressFallback: Record<InvoiceStatus, number> = {
  uploaded: 5,
  queued: 15,
  processing: 30,
  ready_for_review: 100,
  failed: 100,
  cancelled: 100,
  approved: 100,
  exported: 100,
};

export const PROCESSING_STAGES: ProcessingStage[] = [
  "rotate_pdf",
  "ocr",
  "extraction",
  "verification",
  "duplicate_check",
  "validation",
  "classification",
];

export const stageLabels: Record<ProcessingStage, string> = {
  rotate_pdf: "Page Rotation",
  ocr: "OCR Scanning",
  extraction: "Data Extraction",
  verification: "Document Verification",
  duplicate_check: "Duplicate Check",
  validation: "Validation",
  classification: "Classification",
};

export const stageDescriptions: Record<ProcessingStage, string> = {
  rotate_pdf: "Detecting and correcting page orientation...",
  ocr: "Scanning document text with OCR...",
  extraction: "Extracting invoice fields and line items...",
  verification: "Verifying document type...",
  duplicate_check: "Checking for duplicate invoices...",
  validation: "Validating extracted data...",
  classification: "Classifying line item categories...",
};

export function resolveStatusProgress(
  status: InvoiceStatus,
  progress?: number | null,
  stage?: ProcessingStage | null
): number {
  if (typeof progress === "number" && Number.isFinite(progress)) {
    return Math.max(0, Math.min(100, progress));
  }
  if (stage && stage in stageProgressFallback) {
    return stageProgressFallback[stage];
  }
  return statusProgressFallback[status] ?? 0;
}
