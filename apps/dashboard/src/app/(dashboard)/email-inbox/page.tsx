import { Mail } from "lucide-react";
import { getEmailIngestions } from "@/lib/queries/email-inbox";
import { EmptyState } from "@/components/empty-state";
import { EmailInboxClient } from "@/components/email-inbox-client";
import { EmailConnectionBanner } from "@/components/email-connection-banner";
import type { EmailIngestionStatus, EmailIngestionFilters } from "@/types/database";

const VALID_STATUSES: EmailIngestionStatus[] = [
  "received",
  "processing",
  "completed",
  "failed",
];

const DEFAULT_PER_PAGE = 25;

function parseStatus(value: string | string[] | undefined): EmailIngestionStatus | undefined {
  if (typeof value !== "string") return undefined;
  if (VALID_STATUSES.includes(value as EmailIngestionStatus)) {
    return value as EmailIngestionStatus;
  }
  return undefined;
}

function parseNumber(value: string | string[] | undefined, fallback: number): number {
  if (typeof value !== "string") return fallback;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseString(value: string | string[] | undefined): string | undefined {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  return value.trim();
}

export default async function EmailInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  const status = parseStatus(params.status);
  const search = parseString(params.search);
  const page = parseNumber(params.page, 1);
  const perPage = parseNumber(params.limit, DEFAULT_PER_PAGE);

  const filters: EmailIngestionFilters = {
    status,
    search,
    page,
    perPage,
  };

  const { data: emails, count } = await getEmailIngestions(filters);
  const totalPages = Math.ceil(count / perPage);

  if (emails.length === 0 && page === 1 && !status && !search) {
    return (
      <div className="flex flex-col gap-6">
        <EmailConnectionBanner />
        <EmptyState
          icon={<Mail className="size-6 text-muted-foreground" />}
          title="No emails yet"
          description="When emails with invoice attachments are received, they will appear here."
        />
      </div>
    );
  }

  return (
    <EmailInboxClient
      initialEmails={emails}
      totalPages={totalPages}
      currentPage={page}
      totalCount={count}
      currentStatus={status}
      currentSearch={search ?? ""}
    />
  );
}
