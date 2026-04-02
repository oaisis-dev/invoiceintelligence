import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const confidenceBadgeVariants = cva(
  "inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs font-normal leading-4 whitespace-nowrap",
  {
    variants: {
      level: {
        high: "bg-primary-10 text-primary",
        medium: "bg-muted text-text-primary",
        low: "bg-error-10 text-error",
      },
    },
    defaultVariants: {
      level: "high",
    },
  }
);

const dotVariants = cva("size-3 rounded-full", {
  variants: {
    level: {
      high: "bg-primary",
      medium: "bg-text-secondary",
      low: "bg-error",
    },
  },
  defaultVariants: {
    level: "high",
  },
});

const levelLabels: Record<"high" | "medium" | "low", string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

type ConfidenceBadgeProps = Omit<React.ComponentPropsWithoutRef<"span">, "children"> &
  VariantProps<typeof confidenceBadgeVariants>;

function ConfidenceBadge({
  className,
  level,
  ...props
}: ConfidenceBadgeProps) {
  const resolvedLevel = level ?? "high";

  return (
    <span
      data-slot="confidence-badge"
      className={cn(confidenceBadgeVariants({ level: resolvedLevel }), className)}
      {...props}
    >
      <span
        data-slot="confidence-dot"
        className={dotVariants({ level: resolvedLevel })}
        aria-hidden="true"
      />
      {levelLabels[resolvedLevel]}
    </span>
  );
}

export { ConfidenceBadge, confidenceBadgeVariants };
export type { ConfidenceBadgeProps };
