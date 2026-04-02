import { GlassCard } from "@/components/ui/glass-card";
import { Skeleton } from "@/components/ui/skeleton";

function StatCardSkeleton() {
  return (
    <GlassCard className="p-[25px]">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-16" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="size-12 rounded-[12px]" />
      </div>
    </GlassCard>
  );
}

function TableRowSkeleton() {
  return (
    <div className="flex items-center gap-4 py-4">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-5 w-20 rounded-full" />
      <Skeleton className="h-5 w-20 rounded-full" />
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* Page heading skeleton */}
      <div>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-2 h-5 w-72" />
      </div>

      {/* Stat cards grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Quick actions + email summary */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <GlassCard className="p-[25px]">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="mt-2 h-4 w-48" />
          <div className="mt-4 flex gap-3">
            <Skeleton className="h-9 w-36 rounded-[8px]" />
            <Skeleton className="h-9 w-36 rounded-[8px]" />
            <Skeleton className="h-9 w-36 rounded-[8px]" />
          </div>
        </GlassCard>
        <GlassCard className="p-[25px]">
          <div className="flex items-start justify-between">
            <div>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="mt-2 h-4 w-44" />
            </div>
            <Skeleton className="size-12 rounded-[12px]" />
          </div>
          <Skeleton className="mt-4 h-9 w-16" />
        </GlassCard>
      </div>

      {/* Recent invoices table skeleton */}
      <GlassCard>
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-5 w-36" />
              <Skeleton className="mt-2 h-4 w-56" />
            </div>
            <Skeleton className="h-8 w-20 rounded-[8px]" />
          </div>
        </div>
        <div className="px-6 pb-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRowSkeleton key={i} />
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
