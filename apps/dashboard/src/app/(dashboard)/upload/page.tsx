import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardContent,
} from "@/components/ui/glass-card";
import { getEmailIngestions } from "@/lib/queries/email-inbox";
import { EmailIngestionStatus } from "@/components/email-ingestion-status";
import { formatRelativeTime } from "@/lib/format";
import { UploadSection } from "./upload-section";
import { SectionReveal } from "@/components/ui/section-reveal";

// ---------------------------------------------------------------------------
// Email Ingestion Section (Server Component)
// ---------------------------------------------------------------------------

async function EmailIngestionSection() {
  const { data: ingestions } = await getEmailIngestions({ perPage: 5 });

  // Derive summary stats from the most recent ingestions
  const lastPollTime = ingestions.length > 0 ? ingestions[0].created_at : null;
  const emailsProcessed = ingestions.filter(
    (i) => i.status === "completed"
  ).length;
  const attachmentCount = ingestions.reduce(
    (sum, i) => sum + i.attachment_count,
    0
  );

  return (
    <GlassCard>
      <GlassCardHeader className="px-8 pt-8">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold leading-7 tracking-tight text-foreground">
              Email Ingestion
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Recent email polling activity from the processing workers
            </p>
          </div>
          {lastPollTime && (
            <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
              Last poll: {formatRelativeTime(lastPollTime)}
            </span>
          )}
        </div>
      </GlassCardHeader>
      <GlassCardContent className="px-8 pb-8">
        <EmailIngestionStatus
          lastPollTime={lastPollTime}
          emailsProcessed={emailsProcessed}
          attachmentCount={attachmentCount}
        />

        {/* Recent ingestions list */}
        {ingestions.length > 0 && (
          <div className="mt-4 flex flex-col gap-2">
            {ingestions.map((ingestion) => (
              <div
                key={ingestion.id}
                className="flex items-center justify-between rounded-lg border border-border/50 bg-white/50 px-4 py-2.5 text-sm"
              >
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  <span className="truncate font-medium text-foreground">
                    {ingestion.subject}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    From: {ingestion.from_email}
                  </span>
                </div>
                <div className="ml-4 flex items-center gap-3 shrink-0">
                  <span className="text-xs text-muted-foreground">
                    {ingestion.attachment_count} attachment
                    {ingestion.attachment_count === 1 ? "" : "s"}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      ingestion.status === "completed"
                        ? "bg-green-50 text-green-700"
                        : ingestion.status === "failed"
                          ? "bg-red-50 text-red-700"
                          : ingestion.status === "processing"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {ingestion.status.charAt(0).toUpperCase() +
                      ingestion.status.slice(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCardContent>
    </GlassCard>
  );
}

function EmailIngestionSkeleton() {
  return (
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
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function UploadPage() {
  return (
    <div className="flex flex-col gap-8">
      {/* Upload section (Client Component) */}
      <SectionReveal>
        <UploadSection />
      </SectionReveal>

      {/* Email ingestion section (Server Component with suspense) */}
      <SectionReveal delay={0.03}>
        <Suspense fallback={<EmailIngestionSkeleton />}>
          <EmailIngestionSection />
        </Suspense>
      </SectionReveal>
    </div>
  );
}
