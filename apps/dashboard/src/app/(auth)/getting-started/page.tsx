import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { GettingStartedClient } from "./getting-started-client";

function GettingStartedFallback() {
  return (
    <div className="flex w-[440px] flex-col items-center gap-4 rounded-xl border border-[var(--border-input)] bg-white p-8 text-center shadow-sm">
      <Loader2 className="size-10 animate-spin text-[var(--primary)]" />
      <h2 className="text-lg font-semibold text-[var(--text-primary)]">
        Loading your setup
      </h2>
      <p className="text-sm text-[var(--text-secondary)]">
        Checking your workspace status and preparing onboarding.
      </p>
    </div>
  );
}

export default function GettingStartedPage() {
  return (
    <Suspense fallback={<GettingStartedFallback />}>
      <GettingStartedClient />
    </Suspense>
  );
}
