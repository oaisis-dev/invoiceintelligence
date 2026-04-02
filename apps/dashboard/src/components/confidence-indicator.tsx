"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

export interface ConfidenceIndicatorProps {
  /** Confidence score from 0 to 1 */
  confidence: number;
  /** Whether to show the percentage label next to the dot */
  showLabel?: boolean;
  className?: string;
}

type ConfidenceLevel = "high" | "medium" | "low";

function getLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.8) return "high";
  if (confidence >= 0.5) return "medium";
  return "low";
}

const levelConfig: Record<
  ConfidenceLevel,
  { label: string; dotClass: string }
> = {
  high: {
    label: "High confidence",
    dotClass: "bg-success",
  },
  medium: {
    label: "Medium confidence",
    dotClass: "bg-warning",
  },
  low: {
    label: "Low confidence",
    dotClass: "bg-error",
  },
};

export function ConfidenceIndicator({
  confidence,
  showLabel = false,
  className,
}: ConfidenceIndicatorProps) {
  const clamped = Math.max(0, Math.min(1, confidence));
  const level = getLevel(clamped);
  const { label, dotClass } = levelConfig[level];
  const percentage = `${Math.round(clamped * 100)}%`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-xs text-muted-foreground",
            className
          )}
          role="img"
          aria-label={`${label}: ${percentage}`}
        >
          <span
            className={cn("size-2 shrink-0 rounded-full", dotClass)}
            aria-hidden="true"
          />
          {showLabel && (
            <span className="tabular-nums">{percentage}</span>
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {label} ({percentage})
      </TooltipContent>
    </Tooltip>
  );
}
