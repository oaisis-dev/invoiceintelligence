"use client";

import { AlertTriangle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ExtractionConfidenceBannerProps {
  confidence: "high" | "medium" | "low";
  warnings: string[];
  className?: string;
}

const configByLevel = {
  low: {
    icon: AlertCircle,
    title: "Low extraction confidence",
    border: "border-red-200",
    bg: "bg-red-50",
    text: "text-red-800",
    subtext: "text-red-700",
    iconColor: "text-red-600",
  },
  medium: {
    icon: AlertTriangle,
    title: "Extraction may need review",
    border: "border-amber-200",
    bg: "bg-amber-50",
    text: "text-amber-800",
    subtext: "text-amber-700",
    iconColor: "text-amber-600",
  },
  high: {
    icon: AlertTriangle,
    title: "Extraction confidence",
    border: "border-green-200",
    bg: "bg-green-50",
    text: "text-green-800",
    subtext: "text-green-700",
    iconColor: "text-green-600",
  },
};

export function ExtractionConfidenceBanner({
  confidence,
  warnings,
  className,
}: ExtractionConfidenceBannerProps) {
  if (confidence === "high" && warnings.length === 0) return null;

  const config = configByLevel[confidence];
  const Icon = config.icon;

  return (
    <div
      role="alert"
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        config.border,
        config.bg,
        config.text,
        className
      )}
    >
      <div className="flex items-start gap-2">
        <Icon
          className={cn("mt-0.5 size-4 shrink-0", config.iconColor)}
          aria-hidden="true"
        />
        <div>
          <p className="font-medium">{config.title}</p>
          {warnings.length > 0 && (
            <ul className={cn("mt-1 space-y-0.5 text-xs", config.subtext)}>
              {warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
