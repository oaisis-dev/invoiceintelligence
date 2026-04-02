"use client";

import * as React from "react";
import { Mail, Paperclip, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmailIngestionStatusProps {
  /** ISO date string of the last email poll, or null if not yet configured */
  lastPollTime: string | null;
  emailsProcessed: number;
  attachmentCount: number;
  className?: string;
}

/**
 * Formats an ISO date string into a relative time label such as "2 min ago".
 * Replace with shared `formatRelativeTime` from `@/lib/format` when available.
 */
function formatRelativeTime(isoDate: string): string {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffSeconds = Math.round((now - then) / 1000);

  if (diffSeconds < 60) return "just now";
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60)
    return `${diffMinutes} min${diffMinutes === 1 ? "" : "s"} ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24)
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

export function EmailIngestionStatus({
  lastPollTime,
  emailsProcessed,
  attachmentCount,
  className,
}: EmailIngestionStatusProps) {
  if (lastPollTime === null) {
    return (
      <div
        className={cn(
          "rounded-xl border border-white/20 bg-white/70 px-4 py-3 text-sm text-muted-foreground",
          className
        )}
      >
        Email polling not yet configured
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-white/20 bg-white/70 px-4 py-3 text-xs text-muted-foreground",
        className
      )}
    >
      <span className="inline-flex items-center gap-1.5">
        <Clock className="size-3.5" aria-hidden="true" />
        Last checked:{" "}
        <time dateTime={lastPollTime} className="font-medium text-foreground">
          {formatRelativeTime(lastPollTime)}
        </time>
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Mail className="size-3.5" aria-hidden="true" />
        <span className="font-medium text-foreground">{emailsProcessed}</span>{" "}
        email{emailsProcessed === 1 ? "" : "s"} processed
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Paperclip className="size-3.5" aria-hidden="true" />
        <span className="font-medium text-foreground">{attachmentCount}</span>{" "}
        attachment{attachmentCount === 1 ? "" : "s"} found
      </span>
    </div>
  );
}
