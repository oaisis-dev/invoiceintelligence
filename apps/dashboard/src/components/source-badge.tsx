"use client";

import * as React from "react";
import { Upload, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

export interface SourceBadgeProps {
  source: "web_upload" | "email";
  /** Sender email address, shown in tooltip for email sources */
  senderEmail?: string;
  className?: string;
}

export function SourceBadge({
  source,
  senderEmail,
  className,
}: SourceBadgeProps) {
  const isEmail = source === "email";

  const badge = (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-normal leading-4 whitespace-nowrap",
        isEmail
          ? "bg-blue-50 text-blue-700"
          : "bg-muted text-muted-foreground",
        className
      )}
    >
      {isEmail ? (
        <Mail className="size-3" aria-hidden="true" />
      ) : (
        <Upload className="size-3" aria-hidden="true" />
      )}
      {isEmail ? "Email" : "Web Upload"}
    </span>
  );

  if (isEmail && senderEmail) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent>From: {senderEmail}</TooltipContent>
      </Tooltip>
    );
  }

  return badge;
}
