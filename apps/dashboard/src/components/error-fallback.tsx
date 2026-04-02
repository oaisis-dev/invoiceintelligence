"use client";

import * as React from "react";
import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export interface ErrorFallbackProps {
  error: Error & { digest?: string };
  reset: () => void;
  className?: string;
}

export function ErrorFallback({
  error,
  reset,
  className,
}: ErrorFallbackProps) {
  const showDigest = !!error.digest;

  return (
    <div
      className={cn(
        "flex min-h-[300px] items-center justify-center px-4",
        className
      )}
      role="alert"
    >
      <div className="flex max-w-md flex-col items-center rounded-2xl bg-white/70 border border-white/20 px-8 py-10 text-center shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1),0px_4px_6px_0px_rgba(0,0,0,0.1)]">
        <div
          className="mb-4 flex size-12 items-center justify-center rounded-full bg-error-10"
          aria-hidden="true"
        >
          <TriangleAlert className="size-6 text-error" />
        </div>
        <h2 className="text-base font-semibold text-foreground text-balance">
          Something went wrong
        </h2>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          {showDigest
            ? "An unexpected error occurred. Please try again."
            : "We ran into a problem loading this page. Please try again or return to the dashboard."}
        </p>
        {showDigest && (
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            Error ID: {error.digest}
          </p>
        )}
        <div className="mt-6 flex items-center gap-3">
          <Button variant="default" size="sm" onClick={reset}>
            Try Again
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
