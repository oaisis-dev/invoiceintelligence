import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl bg-white/70 border border-white/20 px-6 py-12 text-center",
        className
      )}
    >
      <div
        className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted"
        aria-hidden="true"
      >
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-foreground text-balance">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground text-pretty">
        {description}
      </p>
      {action && (
        <div className="mt-4">
          {action.href ? (
            <Button variant="default" size="sm" asChild>
              <Link href={action.href}>{action.label}</Link>
            </Button>
          ) : (
            <Button variant="default" size="sm" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
