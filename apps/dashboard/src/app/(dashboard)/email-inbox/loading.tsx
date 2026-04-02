import { GlassCard } from "@/components/ui/glass-card";
import { Skeleton } from "@/components/ui/skeleton";

function EmailRowSkeleton() {
  return (
    <GlassCard className="p-5">
      <div className="flex items-center gap-4">
        <Skeleton className="size-10 shrink-0 rounded-full" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3.5 w-56" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
        <Skeleton className="size-5 shrink-0" />
      </div>
    </GlassCard>
  );
}

export default function EmailInboxLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header skeleton */}
      <div className="flex items-start justify-between">
        <div>
          <Skeleton className="h-8 w-36" />
          <Skeleton className="mt-2 h-5 w-72" />
        </div>
        <Skeleton className="h-9 w-24 rounded-[8px]" />
      </div>

      {/* Filter bar skeleton */}
      <GlassCard className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-24 rounded-[8px]" />
            ))}
          </div>
          <Skeleton className="h-9 w-64" />
        </div>
      </GlassCard>

      {/* Email row skeletons */}
      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <EmailRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
