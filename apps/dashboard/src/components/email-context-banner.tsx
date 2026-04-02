"use client";

import * as React from "react";
import { Mail } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmailContextBannerProps {
  fromEmail: string;
  subject: string;
  receivedAt: string;
  className?: string;
}

export function EmailContextBanner({
  fromEmail,
  subject,
  receivedAt,
  className,
}: EmailContextBannerProps) {
  const formattedDate = new Date(receivedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div
      role="status"
      className={cn(
        "flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2.5 text-xs text-blue-700",
        className
      )}
    >
      <Mail className="size-4 shrink-0" aria-hidden="true" />
      <span className="truncate">
        <span className="sr-only">Received via email.</span>
        Received from{" "}
        <span className="font-medium">{fromEmail}</span>
        {" \u2014 "}
        <span className="text-blue-600">{subject}</span>
        {" \u2014 "}
        <time dateTime={receivedAt}>{formattedDate}</time>
      </span>
    </div>
  );
}
