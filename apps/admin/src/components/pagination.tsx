"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  total: number;
  perPage?: number;
}

export function Pagination({ total, perPage = 20 }: PaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentPage = Number(searchParams.get("page") ?? "1");
  const totalPages = Math.ceil(total / perPage);

  const goToPage = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", String(page));
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-sm text-[var(--text-secondary)]">
        Page {currentPage} of {totalPages} ({total} total)
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1}
          className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-input)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--primary-05)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-input)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--primary-05)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
