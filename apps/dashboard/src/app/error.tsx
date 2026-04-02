"use client";

import { useEffect } from "react";
import { ErrorFallback } from "@/components/error-fallback";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="flex min-h-svh items-center justify-center bg-[var(--bg-page)] px-4">
      <ErrorFallback error={error} reset={reset} />
    </div>
  );
}
