import { Skeleton } from "@/components/ui/skeleton";

export default function InvoiceReviewLoading() {
  return (
    <div className="flex flex-col gap-3 overflow-hidden h-[calc(100dvh-64px-2rem)] sm:h-[calc(100dvh-64px-3rem)] lg:h-[calc(100dvh-64px-4rem)]">
      {/* Page header skeleton — invoice title + status + action buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-80" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-18 rounded-md" />
          <Skeleton className="h-7 w-7 rounded-md" />
        </div>
      </div>

      {/* Card skeleton — toolbar + sheet tabs + formula bar + spreadsheet */}
      <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-border/70 bg-card/60 shadow-sm overflow-hidden">
        {/* Toolbar skeleton */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 border-b bg-muted/20">
          <Skeleton className="h-7 w-16 rounded-md" />
          <Skeleton className="h-7 w-20 rounded-md" />
          <Skeleton className="h-7 w-24 rounded-md" />
          <Skeleton className="h-6 w-6 rounded-md" />
          <Skeleton className="h-6 w-6 rounded-md" />
          <div className="flex-1" />
          <Skeleton className="h-7 w-36 rounded-md" />
        </div>

        {/* Sheet tabs skeleton */}
        <div className="flex items-center gap-1 px-2 py-1 border-b bg-muted/10">
          <Skeleton className="h-6 w-24 rounded-md" />
          <Skeleton className="h-6 w-20 rounded-md" />
        </div>

        {/* Formula bar skeleton */}
        <div className="flex items-center gap-2 px-3 py-1 border-b">
          <Skeleton className="h-5 w-12 rounded" />
          <Skeleton className="h-5 w-6" />
          <Skeleton className="h-5 w-64" />
        </div>

        {/* Spreadsheet rows skeleton */}
        <div className="flex-1 overflow-hidden">
          {/* Header row */}
          <div className="flex items-center gap-px border-b-2 border-border/40 bg-muted/30 px-1 py-2">
            <Skeleton className="h-4 w-8 mx-1" />
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-4 mx-1"
                style={{ width: i === 3 ? "200px" : i === 0 ? "100px" : "80px" }}
              />
            ))}
          </div>
          {/* Data rows */}
          {Array.from({ length: 10 }).map((_, rowIdx) => (
            <div key={rowIdx} className="flex items-center gap-px border-b border-border/20 px-1 py-2">
              <Skeleton className="h-4 w-8 mx-1" />
              {Array.from({ length: 9 }).map((_, colIdx) => (
                <Skeleton
                  key={colIdx}
                  className="h-4 mx-1"
                  style={{ width: colIdx === 3 ? "200px" : colIdx === 0 ? "100px" : "80px" }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
