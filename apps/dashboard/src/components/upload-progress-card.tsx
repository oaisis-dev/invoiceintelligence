"use client";

import * as React from "react";
import {
  FileText,
  CircleCheck,
  CircleX,
  LoaderCircle,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatStatusLabel } from "@/lib/invoice-status";
import type { InvoiceStatus } from "@/types/database";

export interface UploadProgressCardProps {
  filename: string;
  status: InvoiceStatus | "uploading" | "skipped_duplicate";
  /** Progress percentage 0-100 */
  progress: number;
  error?: string;
  statusLabel?: string;
  /** ISO timestamp of the original upload, shown for skipped duplicates */
  duplicateUploadedAt?: string;
  className?: string;
}

type VisualState = "uploading" | "processing" | "completed" | "failed";

function mapStatusToVisual(
  status: InvoiceStatus | "uploading" | "skipped_duplicate"
): VisualState {
  switch (status) {
    case "uploading":
    case "uploaded":
    case "queued":
      return "uploading";
    case "processing":
      return "processing";
    case "ready_for_review":
    case "approved":
    case "exported":
    case "skipped_duplicate":
      return "completed";
    case "failed":
    case "cancelled":
      return "failed";
    default:
      return "uploading";
  }
}

const stateConfig: Record<
  VisualState,
  {
    icon: React.ElementType;
    iconClass: string;
    barClass: string;
  }
> = {
  uploading: {
    icon: Upload,
    iconClass: "text-blue-600",
    barClass: "bg-blue-500",
  },
  processing: {
    icon: LoaderCircle,
    iconClass: "text-amber-600 animate-spin",
    barClass: "bg-amber-500",
  },
  completed: {
    icon: CircleCheck,
    iconClass: "text-success",
    barClass: "bg-success",
  },
  failed: {
    icon: CircleX,
    iconClass: "text-error",
    barClass: "bg-error",
  },
};

function formatUploadDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function UploadProgressCard({
  filename,
  status,
  progress,
  error,
  statusLabel,
  duplicateUploadedAt,
  className,
}: UploadProgressCardProps) {
  const visualState = mapStatusToVisual(status);
  const config = stateConfig[visualState];
  const Icon = config.icon;
  const clampedProgress = Math.max(0, Math.min(100, progress));
  const resolvedStatusLabel =
    statusLabel
    ?? (status === "uploading"
      ? "Uploading"
      : status === "skipped_duplicate"
        ? (duplicateUploadedAt
          ? `Already uploaded on ${formatUploadDate(duplicateUploadedAt)}`
          : "Skipped Duplicate")
      : visualState === "completed"
        ? "Completed"
        : formatStatusLabel(status));

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-white/20 bg-white/70 px-4 py-3",
        className
      )}
      role="status"
      aria-label={`${filename}: ${resolvedStatusLabel}${clampedProgress < 100 ? `, ${clampedProgress}%` : ""}`}
    >
      <div className="shrink-0" aria-hidden="true">
        <FileText className="size-5 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium text-foreground">
            {filename}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {resolvedStatusLabel}
          </span>
        </div>
        <div className="mt-1.5">
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={clampedProgress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500 ease-out",
                config.barClass,
                visualState === "processing" && "animate-pulse"
              )}
              style={{ width: `${clampedProgress}%` }}
            />
          </div>
        </div>
        {error && (
          <p className="mt-1 truncate text-xs text-error">{error}</p>
        )}
      </div>
      <div className="shrink-0" aria-hidden="true">
        <Icon className={cn("size-4", config.iconClass)} />
      </div>
    </div>
  );
}
