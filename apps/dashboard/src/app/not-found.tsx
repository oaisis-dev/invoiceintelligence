import Link from "next/link";
import { FileX } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-[var(--bg-page)] px-4">
      <GlassCard className="flex max-w-md flex-col items-center px-8 py-10 text-center">
        <div
          className="mb-4 flex size-12 items-center justify-center rounded-full bg-[var(--primary-10)]"
          aria-hidden="true"
        >
          <FileX className="size-6 text-[var(--primary)]" />
        </div>
        <h2 className="text-base font-semibold text-[var(--text-primary)]">
          Page Not Found
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="mt-6">
          <Button variant="default" size="sm" asChild>
            <Link href="/">Go to Dashboard</Link>
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}
