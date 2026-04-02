"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, FileSpreadsheet, XCircle, RotateCcw, Loader2, Search, Trash2, MoreHorizontal, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { approveInvoice, checkDuplicate, deleteInvoice, exportInvoice, retryInvoice } from "@/lib/api-client";
import type { Invoice, InvoiceStatus } from "@/types/database";
import { getAppEnv } from "@/lib/runtime-config";

interface InvoiceActionsBarProps {
  invoice: Invoice;
  onApprove: () => void;
  onExport: () => void;
  onReject: () => void;
  onRetry?: () => void;
  onCheckDuplicate?: () => void;
  onDelete?: () => void;
  documentUrl?: string | null;
}


/**
 * Statuses where the approve action is available.
 */
const APPROVABLE_STATUSES: InvoiceStatus[] = [
  "ready_for_review",
];

/**
 * Statuses where the export action is available.
 */
const EXPORTABLE_STATUSES: InvoiceStatus[] = [
  "approved",
  "exported",
];

export function InvoiceActionsBar({
  invoice,
  onApprove,
  onExport,
  onReject,
  onRetry,
  onCheckDuplicate,
  onDelete,
  documentUrl,
}: InvoiceActionsBarProps) {
  const router = useRouter();
  const [isApproving, setIsApproving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const canApprove = APPROVABLE_STATUSES.includes(invoice.status);
  const canExport = EXPORTABLE_STATUSES.includes(invoice.status);
  const isCancelled = invoice.status === "cancelled";
  const canCheckDuplicate = !!(invoice.vendor_name && invoice.invoice_number);

  const handleApprove = useCallback(async () => {
    setIsApproving(true);
    try {
      await approveInvoice(invoice.id);
      toast.success("Invoice approved successfully");
      onApprove();
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to approve invoice";
      toast.error(message);
    } finally {
      setIsApproving(false);
    }
  }, [invoice.id, onApprove, router]);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const isReExport = invoice.status === "exported";
      const blob = await exportInvoice(invoice.id);
      // Trigger browser download
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const safeNumber = (invoice.invoice_number ?? invoice.id).replace(/[^a-zA-Z0-9._-]/g, "_");
      link.download = `invoice-${safeNumber}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(
        isReExport
          ? "Invoice re-exported successfully"
          : "Invoice exported successfully"
      );
      onExport();
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to export invoice";
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  }, [invoice.id, invoice.invoice_number, invoice.status, onExport, router]);

  const handleRejectConfirm = useCallback(async () => {
    setIsRejecting(true);
    try {
      // Use the update endpoint to set status to cancelled
      const { updateInvoice } = await import("@/lib/api-client");
      await updateInvoice(invoice.id, {
        status: "cancelled",
      } as Partial<Invoice>);
      toast.success("Invoice rejected");
      onReject();
      setShowRejectConfirm(false);
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to reject invoice";
      toast.error(message);
    } finally {
      setIsRejecting(false);
    }
  }, [invoice.id, onReject, router]);

  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    try {
      await retryInvoice(invoice.id);
      toast.success("Invoice queued for full reprocessing");
      onRetry?.();
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to reprocess invoice";
      toast.error(message);
    } finally {
      setIsRetrying(false);
    }
  }, [invoice.id, onRetry, router]);

  const handleCheckDuplicate = useCallback(async () => {
    setIsCheckingDuplicate(true);
    try {
      const result = await checkDuplicate(invoice.id);
      if (result.match_count > 0) {
        toast.warning(
          `Found ${result.match_count} potential duplicate${result.match_count === 1 ? "" : "s"}`
        );
      } else {
        toast.success("No duplicates found");
      }
      onCheckDuplicate?.();
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to check duplicates";
      toast.error(message);
    } finally {
      setIsCheckingDuplicate(false);
    }
  }, [invoice.id, onCheckDuplicate, router]);

  const handleDeleteConfirm = useCallback(async () => {
    setIsDeleting(true);
    try {
      await deleteInvoice(invoice.id);
      toast.success("Invoice deleted");
      onDelete?.();
      setShowDeleteConfirm(false);
      router.push("/invoices");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete invoice";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }, [invoice.id, onDelete, router]);

  return (
    <div className="flex items-center gap-2">
      {/* Primary actions — always visible */}
      <Button
        size="sm"
        onClick={handleApprove}
        disabled={!canApprove || isApproving || isCancelled}
        className="bg-emerald-600 text-white hover:bg-emerald-700"
      >
        {isApproving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle className="size-4" />}
        {isApproving ? "Approving…" : "Approve"}
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        disabled={!canExport || isExporting}
      >
        {isExporting ? <Loader2 className="size-4 animate-spin" /> : <FileSpreadsheet className="size-4" />}
        {isExporting ? "Exporting…" : "Export"}
      </Button>

      {/* Reject with confirmation */}
      <AlertDialog open={showRejectConfirm} onOpenChange={setShowRejectConfirm}>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={isCancelled || invoice.status === "approved"}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <XCircle className="size-4" />
            Reject
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject this invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the invoice as cancelled. You can still reprocess it later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRejecting}>Keep Invoice</AlertDialogCancel>
            <AlertDialogAction onClick={handleRejectConfirm} disabled={isRejecting}>
              {isRejecting ? <Loader2 className="size-4 animate-spin" /> : null}
              {isRejecting ? "Rejecting…" : "Reject Invoice"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Three-dot overflow menu — secondary actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-xs">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canCheckDuplicate && (
            <DropdownMenuItem onClick={handleCheckDuplicate} disabled={isCheckingDuplicate}>
              <Search className="size-4" />
              {isCheckingDuplicate ? "Checking…" : "Check Duplicates"}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={handleRetry} disabled={isRetrying}>
            <RotateCcw className="size-4" />
            {isRetrying ? "Reprocessing…" : "Reprocess"}
          </DropdownMenuItem>
          {documentUrl && (
            <DropdownMenuItem asChild>
              <a href={documentUrl} target="_blank" rel="noopener noreferrer">
                <FileText className="size-4" />
                View PDF
              </a>
            </DropdownMenuItem>
          )}
          {getAppEnv() !== "production" && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="size-4" />
                {isDeleting ? "Deleting…" : "Delete"}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete confirmation dialog */}
      {getAppEnv() !== "production" && (
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Permanently delete this invoice?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove the invoice, all extracted data, and
                the uploaded PDF. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Keep Invoice</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting}>
                {isDeleting ? <Loader2 className="size-4 animate-spin" /> : null}
                {isDeleting ? "Deleting…" : "Delete Invoice"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
