import {
  GlassCard,
  GlassCardContent,
} from "@/components/ui/glass-card";
import { Skeleton } from "@/components/ui/skeleton";

function FilterBarSkeleton() {
  return (
    <GlassCard>
      <GlassCardContent className="px-6 py-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search input skeleton */}
          <Skeleton className="h-9 min-w-[200px] flex-1 rounded-md" />
          {/* Status dropdown skeleton */}
          <Skeleton className="h-9 w-[150px] rounded-md" />
          {/* Source dropdown skeleton */}
          <Skeleton className="h-9 w-[130px] rounded-md" />
        </div>
      </GlassCardContent>
    </GlassCard>
  );
}

function TableSkeleton() {
  return (
    <GlassCard>
      <div className="p-6">
        {/* Table header */}
        <div className="flex items-center gap-4 border-b border-border pb-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20 ml-auto" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
        {/* Table rows */}
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-3.5 border-b border-border/30 last:border-0">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20 ml-auto" />
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
      {/* Pagination footer skeleton */}
      <div className="flex items-center justify-between border-t border-border/50 px-6 py-4">
        <Skeleton className="h-4 w-48" />
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="size-6 rounded-md" />
          ))}
        </div>
      </div>
    </GlassCard>
  );
}

export default function InvoicesLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-2 h-5 w-72" />
      </div>

      {/* Filter bar */}
      <FilterBarSkeleton />

      {/* Table */}
      <TableSkeleton />
    </div>
  );
}
