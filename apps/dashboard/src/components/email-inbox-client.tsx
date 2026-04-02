"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, RefreshCw, Search } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { EmptyState } from "@/components/empty-state";
import { Pagination } from "@/components/pagination";
import { EmailIngestionRow } from "@/components/email-ingestion-row";
import { useEmailIngestions } from "@/hooks/use-email-ingestions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { EmailConnectionBanner } from "@/components/email-connection-banner";
import type {
  EmailIngestionWithAttachments,
  EmailIngestionStatus,
} from "@/types/database";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "received", label: "Received" },
  { value: "processing", label: "Processing" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
];

interface EmailInboxClientProps {
  initialEmails: EmailIngestionWithAttachments[];
  totalPages: number;
  currentPage: number;
  totalCount: number;
  currentStatus: EmailIngestionStatus | undefined;
  currentSearch: string;
}

export function EmailInboxClient({
  initialEmails,
  totalPages,
  currentPage,
  totalCount,
  currentStatus,
  currentSearch,
}: EmailInboxClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(currentSearch);
  const { newEmails, clearNew } = useEmailIngestions();

  const updateSearchParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      // Reset to page 1 when filters change (unless page itself changed)
      if (!("page" in updates)) {
        params.delete("page");
      }
      startTransition(() => {
        router.push(`/email-inbox?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  const handleStatusChange = useCallback(
    (status: string) => {
      updateSearchParams({
        status: status === "all" ? undefined : status,
      });
    },
    [updateSearchParams]
  );

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      updateSearchParams({ search: searchValue || undefined });
    },
    [updateSearchParams, searchValue]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      updateSearchParams({ page: page > 1 ? String(page) : undefined });
    },
    [updateSearchParams]
  );

  const handleRefresh = useCallback(() => {
    clearNew();
    startTransition(() => {
      router.refresh();
    });
  }, [router, clearNew]);

  const activeStatus = currentStatus ?? "all";

  return (
    <div className="flex flex-col gap-6">
      {/* Connection status */}
      <EmailConnectionBanner />

      {/* Real-time banner */}
      {newEmails.length > 0 && (
        <button
          type="button"
          onClick={handleRefresh}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-50 px-4 py-2.5 text-[14px] font-medium text-blue-700 transition-colors hover:bg-blue-100"
        >
          <Mail className="size-4" aria-hidden="true" />
          {newEmails.length} new email{newEmails.length === 1 ? "" : "s"}{" "}
          received — click to refresh
        </button>
      )}

      {/* Filter bar */}
      <GlassCard className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <ToggleGroup
            type="single"
            value={activeStatus}
            onValueChange={(value) => {
              if (!value) return;
              handleStatusChange(value);
            }}
            aria-label="Filter by status"
            className="flex flex-wrap items-center gap-2"
          >
            {STATUS_OPTIONS.map((option) => (
              <ToggleGroupItem
                key={option.value}
                value={option.value}
                aria-label={option.label}
              >
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <div className="flex items-center gap-3">
            <form onSubmit={handleSearchSubmit} className="relative max-w-xs flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-secondary"
                aria-hidden="true"
              />
              <Input
                type="text"
                name="email_inbox_search"
                autoComplete="off"
                inputMode="search"
                spellCheck={false}
                placeholder="Search by sender or subject…"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                aria-label="Search emails by sender or subject"
                className="h-9 w-full border-border-input bg-white pl-10 pr-3 text-[14px] leading-[20px] tracking-[-0.15px] text-text-primary placeholder:text-text-secondary focus-visible:border-primary focus-visible:ring-primary/30"
              />
            </form>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isPending}
              className="gap-2"
            >
              <RefreshCw
                className={`size-4 ${isPending ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              Refresh
            </Button>
          </div>
        </div>
      </GlassCard>

      {/* Email list */}
      <div
        className={`flex flex-col gap-3 transition-opacity duration-150 ${
          isPending ? "pointer-events-none opacity-60" : ""
        }`}
      >
        {initialEmails.length === 0 ? (
          <EmptyState
            icon={<Mail className="size-6 text-muted-foreground" />}
            title="No emails match your filters"
            description="Try adjusting your search or status filter to find what you're looking for."
          />
        ) : (
          initialEmails.map((email) => (
            <EmailIngestionRow key={email.id} email={email} />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-text-secondary">
            Showing {(currentPage - 1) * 25 + 1}
            {" - "}
            {Math.min(currentPage * 25, totalCount)} of {totalCount} emails
          </p>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
}
