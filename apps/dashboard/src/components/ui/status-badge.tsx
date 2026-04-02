import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const statusBadgeVariants = cva(
  "inline-flex items-center justify-center rounded-full px-2 py-1 text-xs font-normal leading-4 whitespace-nowrap",
  {
    variants: {
      variant: {
        success: "bg-success-10 text-success",
        warning: "bg-muted text-text-primary",
        error: "bg-error-10 text-error",
      },
    },
    defaultVariants: {
      variant: "success",
    },
  }
);

type StatusBadgeProps = React.ComponentPropsWithoutRef<"span"> &
  VariantProps<typeof statusBadgeVariants>;

function StatusBadge({ className, variant, children, ...props }: StatusBadgeProps) {
  return (
    <span
      data-slot="status-badge"
      className={cn(statusBadgeVariants({ variant }), className)}
      {...props}
    >
      {children}
    </span>
  );
}

export { StatusBadge, statusBadgeVariants };
export type { StatusBadgeProps };
