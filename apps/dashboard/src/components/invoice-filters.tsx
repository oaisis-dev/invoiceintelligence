"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X, RotateCcw, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { exportByCategory } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatStatusLabel, INVOICE_STATUSES } from "@/lib/invoice-status";
import type { InvoiceStatus, InvoiceSource, DuplicateStatus } from "@/types/database";
import { DEFAULT_DATE_RANGE_DAYS } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type StatusOption = { value: InvoiceStatus | "all"; label: string };
type SourceOption = { value: InvoiceSource | "all"; label: string };
type DuplicateOption = { value: DuplicateStatus | "all"; label: string };

const STATUS_OPTIONS: StatusOption[] = [
  { value: "all", label: "All Statuses" },
  ...INVOICE_STATUSES.map((status) => ({
    value: status,
    label: formatStatusLabel(status),
  })),
];

const SOURCE_OPTIONS: SourceOption[] = [
  { value: "all", label: "All Sources" },
  { value: "web_upload", label: "Web Upload" },
  { value: "email", label: "Email" },
];

const DUPLICATE_OPTIONS: DuplicateOption[] = [
  { value: "all", label: "All Duplicates" },
  { value: "suspected", label: "Suspected" },
  { value: "confirmed_duplicate", label: "Confirmed" },
  { value: "dismissed", label: "Dismissed" },
  { value: "none", label: "No Duplicates" },
];

const DEBOUNCE_MS = 400;

// ---------------------------------------------------------------------------
// Debounced text input sub-component
// ---------------------------------------------------------------------------

/**
 * Debounced text input. Uses a `key` prop (the URL value) to reset
 * local state when the URL changes externally, avoiding setState-in-effect.
 */
function DebouncedInput({
  defaultValue,
  onCommit,
  disabled,
  placeholder,
  ariaLabel,
  icon,
  className,
}: {
  defaultValue: string;
  onCommit: (value: string) => void;
  disabled: boolean;
  placeholder: string;
  ariaLabel: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value;
      setValue(next);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onCommit(next);
      }, DEBOUNCE_MS);
    },
    [onCommit]
  );

  const handleClear = useCallback(() => {
    setValue("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onCommit("");
  }, [onCommit]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className={className}>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {icon}
          </span>
        )}
        <Input
          type="text"
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          className={`h-9 w-full py-1 text-sm text-foreground ${icon ? "pl-9 pr-8" : "px-3 pr-8"}`}
          aria-label={ariaLabel}
        />
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="absolute right-1.5 top-1/2 -translate-y-1/2"
            onClick={handleClear}
            aria-label={`Clear ${ariaLabel.toLowerCase()}`}
          >
            <X className="size-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function InvoiceFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Derive current filter values from URL
  const currentStatus = (searchParams.get("status") ?? "all") as
    | InvoiceStatus
    | "all";
  const currentSource = (searchParams.get("source") ?? "all") as
    | InvoiceSource
    | "all";
  const currentDuplicateStatus = (searchParams.get("duplicateStatus") ?? "all") as
    | DuplicateStatus
    | "all";
  const defaultFrom = new Date(Date.now() - DEFAULT_DATE_RANGE_DAYS * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const defaultTo = new Date().toISOString().slice(0, 10);
  const currentDateFrom = searchParams.get("dateFrom") ?? defaultFrom;
  const currentDateTo = searchParams.get("dateTo") ?? defaultTo;
  const urlSearch = searchParams.get("search") ?? "";
  const normalizedStatus = STATUS_OPTIONS.some((opt) => opt.value === currentStatus)
    ? currentStatus
    : "all";
  const normalizedSource = SOURCE_OPTIONS.some((opt) => opt.value === currentSource)
    ? currentSource
    : "all";
  const normalizedDuplicateStatus = DUPLICATE_OPTIONS.some(
    (opt) => opt.value === currentDuplicateStatus
  )
    ? currentDuplicateStatus
    : "all";

  const hasActiveFilters =
    normalizedStatus !== "all" ||
    normalizedSource !== "all" ||
    normalizedDuplicateStatus !== "all" ||
    currentDateFrom !== "" ||
    currentDateTo !== "" ||
    urlSearch !== "";

  /** Build a new URL with updated params and navigate. */
  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, val] of Object.entries(updates)) {
        if (val === null || val === "" || val === "all") {
          params.delete(key);
        } else {
          params.set(key, val);
        }
      }

      // Reset to page 1 whenever filters change
      params.delete("page");

      const qs = params.toString();
      const url = qs ? `${pathname}?${qs}` : pathname;
      startTransition(() => {
        router.push(url, { scroll: false });
      });
    },
    [pathname, router, searchParams, startTransition]
  );

  const handleStatusChange = useCallback(
    (value: string) => {
      updateParams({ status: value });
    },
    [updateParams]
  );

  const handleSourceChange = useCallback(
    (value: string) => {
      updateParams({ source: value });
    },
    [updateParams]
  );

  const handleDuplicateChange = useCallback(
    (value: string) => {
      updateParams({ duplicateStatus: value });
    },
    [updateParams]
  );

  const handleSearch = useCallback(
    (value: string) => {
      updateParams({ search: value || null });
    },
    [updateParams]
  );

  const handleDateFromChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateParams({ dateFrom: e.target.value });
    },
    [updateParams]
  );

  const handleDateToChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateParams({ dateTo: e.target.value });
    },
    [updateParams]
  );

  const handleClearAll = useCallback(() => {
    startTransition(() => {
      router.push(pathname, { scroll: false });
    });
  }, [pathname, router, startTransition]);

  const [isExporting, setIsExporting] = useState(false);

  const handleExportByCategory = useCallback(async () => {
    setIsExporting(true);
    try {
      const filters: Record<string, string> = {};
      if (normalizedStatus !== "all") filters.status = normalizedStatus;
      if (urlSearch) filters.search = urlSearch;
      if (normalizedSource !== "all") filters.source = normalizedSource;
      if (normalizedDuplicateStatus !== "all")
        filters.duplicateStatus = normalizedDuplicateStatus;
      if (currentDateFrom) filters.dateFrom = currentDateFrom;
      if (currentDateTo) filters.dateTo = currentDateTo;

      const blob = await exportByCategory(filters);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const date = new Date().toISOString().slice(0, 10);
      link.download = `invoice-items-by-category-${date}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Category export downloaded");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to export by category";
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  }, [
    normalizedStatus,
    urlSearch,
    normalizedSource,
    normalizedDuplicateStatus,
    currentDateFrom,
    currentDateTo,
  ]);

  return (
    <div className="flex items-center gap-2.5">
      {/* Search */}
      <DebouncedInput
        key={`search-${urlSearch}`}
        defaultValue={urlSearch}
        onCommit={handleSearch}
        disabled={isPending}
        placeholder="Search…"
        ariaLabel="Search invoices"
        icon={<Search className="size-4" aria-hidden="true" />}
        className="w-[180px]"
      />

      {/* Divider */}
      <div className="h-5 w-px shrink-0 bg-border" />

      {/* Status */}
      <Select value={normalizedStatus} onValueChange={handleStatusChange}>
        <SelectTrigger
          aria-label="Filter by status"
          className="h-9 w-[145px]"
        >
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Source */}
      <Select value={normalizedSource} onValueChange={handleSourceChange}>
        <SelectTrigger
          aria-label="Filter by source"
          className="h-9 w-[130px]"
        >
          <SelectValue placeholder="All Sources" />
        </SelectTrigger>
        <SelectContent>
          {SOURCE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Duplicate status */}
      <Select
        value={normalizedDuplicateStatus}
        onValueChange={handleDuplicateChange}
      >
        <SelectTrigger
          aria-label="Filter by duplicate status"
          className="h-9 w-[145px]"
        >
          <SelectValue placeholder="All Duplicates" />
        </SelectTrigger>
        <SelectContent>
          {DUPLICATE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Divider */}
      <div className="h-5 w-px shrink-0 bg-border" />

      {/* Date range */}
      <div className="flex items-center gap-1.5">
        <Input
          id="filter-date-from"
          type="date"
          value={currentDateFrom}
          onChange={handleDateFromChange}
          disabled={isPending}
          aria-label="From date"
          className="h-9 w-[135px] px-2 text-sm text-foreground"
        />
        <span className="text-xs text-muted-foreground">–</span>
        <Input
          id="filter-date-to"
          type="date"
          value={currentDateTo}
          onChange={handleDateToChange}
          disabled={isPending}
          aria-label="To date"
          className="h-9 w-[135px] px-2 text-sm text-foreground"
        />
      </div>

      {/* Clear filters + Export by Category */}
      <div className="ml-auto flex items-center gap-2">
        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={handleClearAll}
            disabled={isPending}
            className="shrink-0 text-muted-foreground hover:text-foreground"
            aria-label="Clear all filters"
          >
            <RotateCcw className="size-3.5" />
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleExportByCategory}
          disabled={isExporting}
          className="shrink-0"
          aria-label="Export by category"
        >
          {isExporting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <FileSpreadsheet className="size-4" />
          )}
          {isExporting ? "Exporting…" : "Export"}
        </Button>
      </div>
    </div>
  );
}
