"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/**
 * Computes the array of page numbers to display, with ellipsis represented
 * as null. Shows at most 5 page buttons plus up to 2 ellipsis indicators.
 */
function getPageNumbers(
  currentPage: number,
  totalPages: number
): (number | null)[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | null)[] = [];

  // Always show first page
  pages.push(1);

  if (currentPage > 3) {
    pages.push(null); // left ellipsis
  }

  // Window around current page
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (currentPage < totalPages - 2) {
    pages.push(null); // right ellipsis
  }

  // Always show last page
  pages.push(totalPages);

  return pages;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: PaginationProps) {
  const pages = getPageNumbers(currentPage, totalPages);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft" && currentPage > 1) {
        e.preventDefault();
        onPageChange(currentPage - 1);
      } else if (e.key === "ArrowRight" && currentPage < totalPages) {
        e.preventDefault();
        onPageChange(currentPage + 1);
      }
    },
    [currentPage, totalPages, onPageChange]
  );

  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex items-center gap-1", className)}
      onKeyDown={handleKeyDown}
    >
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        aria-label="Go to previous page"
      >
        <ChevronLeft className="size-4" />
      </Button>

      {pages.map((page, index) =>
        page === null ? (
          <span
            key={`ellipsis-${index}`}
            className="flex size-6 items-center justify-center text-xs text-muted-foreground select-none"
            aria-hidden="true"
          >
            ...
          </span>
        ) : (
          <Button
            key={page}
            variant={page === currentPage ? "default" : "ghost"}
            size="icon-xs"
            onClick={() => onPageChange(page)}
            aria-label={`Go to page ${page}`}
            aria-current={page === currentPage ? "page" : undefined}
          >
            {page}
          </Button>
        )
      )}

      <Button
        variant="ghost"
        size="icon-xs"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        aria-label="Go to next page"
      >
        <ChevronRight className="size-4" />
      </Button>
    </nav>
  );
}
