"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Upload, FileText, X, AlertCircle, Loader2, Info } from "lucide-react";
import { toast } from "sonner";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardContent,
} from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { UploadProgressCard } from "@/components/upload-progress-card";
import { useSubscription } from "@/components/subscription/subscription-provider";
import { UpgradeBanner } from "@/components/subscription/upgrade-banner";
import { LimitReachedDialog } from "@/components/subscription/limit-reached-dialog";
import { getInvoiceStatus, uploadInvoices } from "@/lib/api-client";
import type { InvoiceStatus, ProcessingStage } from "@/types/database";
import { isTerminalStatus, resolveStatusProgress, stageDescriptions } from "@/lib/invoice-status";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_FILES = 20;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_FILE_SIZE_LABEL = "10 MB";
const ACCEPTED_MIMES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/tiff",
]);
const ACCEPTED_EXTENSIONS = new Set(["pdf", "png", "jpg", "jpeg", "tiff", "tif"]);
const ACCEPTED_INPUT = ".pdf,.png,.jpg,.jpeg,.tiff,.tif";
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_FAILURES = 1;
const MAX_POLL_CYCLES = 90;
const POLL_FAILURE_MESSAGE = "Status updates unavailable. Open invoice for the latest state.";
const POLL_TIMEOUT_MESSAGE = "Status updates timed out. Open invoice for the latest state.";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QueuedFile {
  id: string;
  file: File;
  error: string | null;
}

type UploadState = "idle" | "uploading" | "error";
type TrackedUploadStatus = InvoiceStatus | "skipped_duplicate";

type TrackedUpload = {
  id: string;
  fileName: string;
  invoiceId?: string;
  status: TrackedUploadStatus;
  progress: number;
  processingStage?: ProcessingStage | null;
  duplicateUploadedAt?: string;
  error?: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function validateFile(file: File): string | null {
  const ext = file.name.toLowerCase().split(".").pop() ?? "";
  if (!ACCEPTED_MIMES.has(file.type) && !ACCEPTED_EXTENSIONS.has(ext)) {
    return `"${file.name}" is not an accepted file type. Accepted: PDF, PNG, JPG, TIFF.`;
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `"${file.name}" exceeds ${MAX_FILE_SIZE_LABEL} (${formatFileSize(file.size)}).`;
  }
  return null;
}

function resolveProgress(
  status: TrackedUploadStatus,
  progress?: number | null,
  stage?: ProcessingStage | null
): number {
  if (status === "skipped_duplicate") return 100;
  return resolveStatusProgress(status, progress, stage);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UploadSection() {
  const { usage, refresh: refreshUsage } = useSubscription();
  const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([]);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [trackedUploads, setTrackedUploads] = useState<TrackedUpload[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pollingGuardRef = useRef(false);
  const pollFailureCountsRef = useRef<Record<string, number>>({});
  const pollCycleCountsRef = useRef<Record<string, number>>({});

  const validFiles = useMemo(
    () => queuedFiles.filter((f) => f.error === null),
    [queuedFiles]
  );

  const activeUploads = useMemo(
    () =>
      trackedUploads.filter(
        (item) =>
          !!item.invoiceId &&
          item.status !== "skipped_duplicate" &&
          !isTerminalStatus(item.status) &&
          !item.error
      ),
    [trackedUploads]
  );

  /** Add files (already snapshot as a plain array). */
  const addFiles = useCallback((files: File[]) => {
    if (files.length === 0) return;

    setQueuedFiles((prev) => {
      const currentValidCount = prev.filter((f) => f.error === null).length;
      let added = 0;
      const newEntries: QueuedFile[] = [];

      for (const file of files) {
        const validationError = validateFile(file);

        // Check max files limit for valid files only
        if (!validationError && currentValidCount + added >= MAX_FILES) {
          newEntries.push({
            id: `${file.name}-${Date.now()}-${Math.random()}`,
            file,
            error: `Maximum ${MAX_FILES} files allowed.`,
          });
          continue;
        }

        if (!validationError) added++;

        newEntries.push({
          id: `${file.name}-${Date.now()}-${Math.random()}`,
          file,
          error: validationError,
        });
      }

      return [...prev, ...newEntries];
    });
  }, []);

  // ---- Drag-and-drop handlers ----

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      // Snapshot files before any state updates — the browser may clean up
      // dataTransfer after the handler returns, and React 18 batching can
      // defer the updater inside addFiles past that point.
      const files = Array.from(e.dataTransfer.files);
      setIsDragging(false);
      addFiles(files);
    },
    [addFiles]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      // Snapshot files before clearing the input value. FileList is a live
      // reference — clearing the input empties it, and React 18 batching
      // may defer the setQueuedFiles updater past that point.
      const files = Array.from(e.target.files ?? []);
      e.target.value = "";
      addFiles(files);
    },
    [addFiles]
  );

  const handleBrowse = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const removeFile = useCallback((id: string) => {
    setQueuedFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  // ---- Pre-upload limit check ----

  const isAtLimit = usage
    ? usage.monthlyInvoiceCount >= usage.monthlyInvoiceLimit
    : false;
  const isSoftBlocked = usage
    ? usage.subscriptionStatus === "past_due" &&
      !!usage.gracePeriodEnd &&
      new Date(usage.gracePeriodEnd) <= new Date()
    : false;
  const isUploadBlocked = isAtLimit || isSoftBlocked;

  // ---- Upload handler ----

  const handleUpload = useCallback(async () => {
    const filesToUpload = queuedFiles.filter((f) => f.error === null);

    if (filesToUpload.length === 0) return;

    // Client-side limit check — show dialog instead of waiting for 403
    if (isUploadBlocked) {
      setLimitDialogOpen(true);
      return;
    }

    setUploadState("uploading");

    try {
      const result = await uploadInvoices(filesToUpload.map((f) => f.file));
      const byFilename = new Map((result.results ?? []).map((item) => [item.fileName, item]));

      const nextTracked: TrackedUpload[] = filesToUpload.map((entry, index) => {
        const resolved = byFilename.get(entry.file.name);
        const fallbackId = result.invoiceIds[index];
        const status = resolved?.status ?? (fallbackId ? "queued" : "failed");
        const invoiceId = resolved?.invoiceId ?? fallbackId;
        const error = resolved?.error;

        return {
          id: entry.id,
          fileName: entry.file.name,
          invoiceId,
          status,
          progress: resolveProgress(status),
          ...(resolved?.duplicateUploadedAt ? { duplicateUploadedAt: resolved.duplicateUploadedAt } : {}),
          ...(error ? { error } : {}),
        };
      });

      setTrackedUploads((prev) => {
        const keepExisting = prev.filter(
          (item) => !nextTracked.some((next) => next.fileName === item.fileName)
        );
        return [...keepExisting, ...nextTracked];
      });

      // Keep invalid files visible, clear uploaded-valid files.
      setQueuedFiles((prev) => prev.filter((f) => f.error !== null));
      setUploadState("idle");

      refreshUsage();
      toast.success(
        `${result.uploaded} invoice${result.uploaded === 1 ? "" : "s"} uploaded successfully`
      );

      const failedCount = nextTracked.filter((item) => item.status === "failed").length;
      const skippedCount = nextTracked.filter(
        (item) => item.status === "skipped_duplicate"
      ).length;
      if (failedCount > 0) {
        toast.error(`${failedCount} file${failedCount === 1 ? "" : "s"} failed to queue.`);
      }
      if (skippedCount > 0) {
        toast.warning(
          `${skippedCount} duplicate file${skippedCount === 1 ? "" : "s"} skipped.`
        );
      }
    } catch (err) {
      setUploadState("error");
      const message =
        err instanceof Error ? err.message : "Upload failed. Please try again.";
      toast.error(message);
    }
  }, [queuedFiles, isUploadBlocked, refreshUsage]);

  const handleReset = useCallback(() => {
    setQueuedFiles([]);
    setTrackedUploads([]);
    setUploadState("idle");
    pollFailureCountsRef.current = {};
    pollCycleCountsRef.current = {};
  }, []);

  // ---- Polling ----

  useEffect(() => {
    if (activeUploads.length === 0) return;

    const pollOnce = async () => {
      if (pollingGuardRef.current) return;
      pollingGuardRef.current = true;

      try {
        const updates = new Map<string, Partial<TrackedUpload>>();

        for (const item of activeUploads) {
          if (!item.invoiceId) continue;

          const invoiceId = item.invoiceId;
          const pollCycle = (pollCycleCountsRef.current[invoiceId] ?? 0) + 1;
          pollCycleCountsRef.current[invoiceId] = pollCycle;

          if (pollCycle > MAX_POLL_CYCLES) {
            updates.set(invoiceId, { error: POLL_TIMEOUT_MESSAGE });
            continue;
          }

          try {
            const payload = await getInvoiceStatus(invoiceId);
            pollFailureCountsRef.current[invoiceId] = 0;
            updates.set(invoiceId, {
              status: payload.status,
              progress: resolveProgress(payload.status, payload.progress, payload.processing_stage),
              processingStage: payload.processing_stage,
              error:
                payload.status === "failed"
                  ? "Processing failed. Open invoice for details."
                  : undefined,
            });
          } catch {
            const failures = (pollFailureCountsRef.current[invoiceId] ?? 0) + 1;
            pollFailureCountsRef.current[invoiceId] = failures;

            if (failures >= MAX_POLL_FAILURES) {
              updates.set(invoiceId, { error: POLL_FAILURE_MESSAGE });
            }
          }
        }

        if (updates.size > 0) {
          setTrackedUploads((prev) =>
            prev.map((item) => {
              if (!item.invoiceId) return item;
              const update = updates.get(item.invoiceId);
              return update ? { ...item, ...update } : item;
            })
          );
        }
      } finally {
        pollingGuardRef.current = false;
      }
    };

    void pollOnce();
    const interval = window.setInterval(() => {
      void pollOnce();
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [activeUploads]);

  // ---- Render ----

  return (
    <>
    <UpgradeBanner />
    <GlassCard>
      <GlassCardHeader className="px-8 pt-8">
        <h2 className="text-lg font-semibold leading-7 tracking-tight text-foreground">
          Upload Invoices
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload invoices (PDF, PNG, JPG, TIFF) for AI-powered processing and extraction
        </p>
      </GlassCardHeader>
      <GlassCardContent className="px-8 pb-8">
        {/* Drop zone */}
        <div
          role="region"
          aria-label="File upload drop zone"
          data-testid="drop-zone"
          data-dragging={isDragging ? "true" : "false"}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex min-h-[200px] flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border bg-muted/30"
          }`}
        >
          <Upload
            className="mb-4 size-12 text-primary"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <p className="text-lg font-medium text-foreground">
            Drop your files here
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            PDF, PNG, JPG, or TIFF — up to {MAX_FILES} files, max {MAX_FILE_SIZE_LABEL} each
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-6"
            onClick={handleBrowse}
            disabled={uploadState === "uploading"}
          >
            Browse Files
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_INPUT}
            onChange={handleFileInputChange}
            className="hidden"
            aria-label="Select files to upload"
          />
        </div>

        {/* Queued files list */}
        {queuedFiles.length > 0 && (
          <div className="mt-4 flex flex-col gap-2">
            {queuedFiles.map((entry) => (
              <div
                key={entry.id}
                className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
                  entry.error
                    ? "border-red-200 bg-red-50/50"
                    : "border-border/50 bg-white/50"
                }`}
              >
                {entry.error ? (
                  <AlertCircle
                    className="size-5 shrink-0 text-red-500"
                    aria-hidden="true"
                  />
                ) : (
                  <FileText
                    className="size-5 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                )}
                <div className="flex min-w-0 flex-1 flex-col">
                  <span
                    className={`truncate text-sm font-medium ${
                      entry.error ? "text-red-700" : "text-foreground"
                    }`}
                  >
                    {entry.file.name}
                  </span>
                  {entry.error ? (
                    <span className="text-xs text-red-600">
                      {entry.error}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(entry.file.size)}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(entry.id)}
                  disabled={uploadState === "uploading"}
                  className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                  aria-label={`Remove ${entry.file.name}`}
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload button */}
        {validFiles.length > 0 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {validFiles.length} file
              {validFiles.length === 1 ? "" : "s"} ready to upload
            </p>
            <Button
              onClick={handleUpload}
              disabled={uploadState === "uploading"}
            >
              {uploadState === "uploading" ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <Upload className="size-4" />
                  Upload {validFiles.length} File
                  {validFiles.length === 1 ? "" : "s"}
                </>
              )}
            </Button>
          </div>
        )}

        {/* Server-tracked statuses */}
        {trackedUploads.length > 0 && (
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">Upload Progress</p>
              <Button variant="ghost" size="sm" onClick={handleReset}>
                Clear
              </Button>
            </div>
            {activeUploads.length > 0 && (
              <div className="flex items-start gap-2 rounded-lg bg-primary/5 px-3 py-2">
                <Info className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
                <p className="text-xs text-muted-foreground">
                  Processing happens in the background. You can start a new upload or
                  navigate to other pages while your invoices are being processed.
                </p>
              </div>
            )}

            {trackedUploads.map((item) => (
              <div key={item.id} className="space-y-1">
                <UploadProgressCard
                  filename={item.fileName}
                  status={item.status}
                  progress={item.progress}
                  error={item.error}
                  duplicateUploadedAt={item.duplicateUploadedAt}
                  statusLabel={
                    item.status === "processing" && item.processingStage
                      ? stageDescriptions[item.processingStage]
                      : undefined
                  }
                />
                {item.invoiceId && (
                  <Link
                    href={`/invoices/${item.invoiceId}`}
                    className="pl-1 text-xs text-primary underline-offset-2 hover:underline"
                  >
                    Open Invoice
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </GlassCardContent>
    </GlassCard>
    <LimitReachedDialog
      open={limitDialogOpen}
      onOpenChange={setLimitDialogOpen}
      message={
        isSoftBlocked
          ? "Your subscription payment is overdue and the grace period has expired. Please update your payment method to continue uploading."
          : undefined
      }
    />
    </>
  );
}
