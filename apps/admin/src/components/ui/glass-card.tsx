import * as React from "react";
import { cn } from "@/lib/utils";

const GlassCard = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="glass-card"
    className={cn(
      "bg-[var(--bg-card)] border border-[var(--bg-card-border)] rounded-2xl shadow-card",
      className
    )}
    {...props}
  />
));
GlassCard.displayName = "GlassCard";

function GlassCardHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="glass-card-header"
      className={cn("px-6 pt-6", className)}
      {...props}
    />
  );
}

function GlassCardContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="glass-card-content"
      className={cn("px-6 pb-6", className)}
      {...props}
    />
  );
}

export { GlassCard, GlassCardHeader, GlassCardContent };
