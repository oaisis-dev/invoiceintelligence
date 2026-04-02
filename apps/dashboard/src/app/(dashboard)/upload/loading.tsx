import {
  GlassCard,
  GlassCardHeader,
  GlassCardContent,
} from "@/components/ui/glass-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function UploadLoading() {
  return (
    <div className="flex flex-col gap-8">
      {/* Upload zone skeleton */}
      <GlassCard>
        <GlassCardHeader className="px-8 pt-8">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="mt-2 h-5 w-72" />
        </GlassCardHeader>
        <GlassCardContent className="px-8 pb-8">
          <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30">
            <Skeleton className="mb-4 size-12 rounded-lg" />
            <Skeleton className="h-6 w-48" />
            <Skeleton className="mt-2 h-4 w-64" />
            <Skeleton className="mt-6 h-9 w-28 rounded-md" />
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* Email ingestion skeleton */}
      <GlassCard>
        <GlassCardHeader className="px-8 pt-8">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="mt-2 h-5 w-64" />
        </GlassCardHeader>
        <GlassCardContent className="px-8 pb-8">
          <Skeleton className="h-12 w-full rounded-xl" />
          <div className="mt-4 flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        </GlassCardContent>
      </GlassCard>
    </div>
  );
}
