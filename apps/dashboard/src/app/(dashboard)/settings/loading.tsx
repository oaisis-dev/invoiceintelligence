import { GlassCard } from "@/components/ui/glass-card";
import { Skeleton } from "@/components/ui/skeleton";

function FieldSkeleton({ wide = false }: { wide?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Skeleton className="h-4 w-28" />
      <Skeleton className={`h-9 ${wide ? "w-full" : "w-64"} rounded-md`} />
    </div>
  );
}

export default function SettingsLoading() {
  return (
    <div className="space-y-8">
      {/* Page heading */}
      <div>
        <Skeleton className="h-8 w-28" />
        <Skeleton className="mt-2 h-5 w-72" />
      </div>

      {/* Organization Information */}
      <GlassCard className="p-[25px]">
        <Skeleton className="h-6 w-48 mb-4" />
        <FieldSkeleton wide />
      </GlassCard>

      {/* Export & Processing */}
      <GlassCard className="p-[25px]">
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-56" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-3 w-64" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
        </div>
      </GlassCard>

      {/* Save button */}
      <div className="flex justify-end">
        <Skeleton className="h-10 w-36 rounded-md" />
      </div>
    </div>
  );
}
