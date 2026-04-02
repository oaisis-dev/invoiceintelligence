import Link from "next/link";
import { AlertTriangle, FileText, RefreshCw } from "lucide-react";
import {
  GlassCard,
  GlassCardContent,
} from "@/components/ui/glass-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { SourceBadge } from "@/components/source-badge";
import { EmptyState } from "@/components/empty-state";
import { InvoiceFilters } from "@/components/invoice-filters";
import { InvoicesPagination } from "./invoices-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { ReviewRecommendations } from "@/components/review-recommendations";
import { getInvoices, getOrgConfigVersion, getReviewRecommendations } from "@/lib/queries/invoices";
import { formatCurrency, formatDate, formatRelativeTime } from "@/lib/format";
import {
  formatStatusLabel,
  INVOICE_STATUSES,
  statusToVariant,
} from "@/lib/invoice-status";
import type { InvoiceStatus, InvoiceSource, DuplicateStatus } from "@/types/database";
import { SectionReveal } from "@/components/ui/section-reveal";
import { DEFAULT_DATE_RANGE_DAYS } from "@/lib/constants";
import { InvoicesTableClient } from "./invoices-table-client";
import { PreviewButton } from "./preview-button";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_PER_PAGE = 25;

function parseInvoiceStatus(
  value: string | string[] | undefined
): InvoiceStatus | undefined {
  if (typeof value !== "string") return undefined;
  if (INVOICE_STATUSES.includes(value as InvoiceStatus)) {
    return value as InvoiceStatus;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  // Parse filter values from searchParams
  const status = parseInvoiceStatus(params.status);
  const source = typeof params.source === "string"
    ? (params.source as InvoiceSource | "all")
    : undefined;
  const search = typeof params.search === "string" ? params.search : undefined;
  const now = new Date();
  const defaultFrom = new Date(now.getTime() - DEFAULT_DATE_RANGE_DAYS * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const defaultTo = now.toISOString().slice(0, 10);
  const dateFrom = typeof params.dateFrom === "string" ? params.dateFrom : defaultFrom;
  const dateTo = typeof params.dateTo === "string" ? params.dateTo : defaultTo;
  const duplicateStatus = typeof params.duplicateStatus === "string"
    ? (params.duplicateStatus as DuplicateStatus)
    : undefined;
  const page = typeof params.page === "string" ? Math.max(1, parseInt(params.page, 10) || 1) : 1;
  const perPage = typeof params.limit === "string"
    ? Math.max(1, Math.min(100, parseInt(params.limit, 10) || DEFAULT_PER_PAGE))
    : DEFAULT_PER_PAGE;

  // Fetch invoices, review recommendations, and org config version in parallel
  const [{ data: invoices, count }, recommendations, orgConfigVersion] = await Promise.all([
    getInvoices({
      status,
      source,
      search,
      dateFrom,
      dateTo,
      duplicateStatus,
      page,
      perPage,
    }),
    getReviewRecommendations(),
    getOrgConfigVersion(),
  ]);

  const totalPages = Math.max(1, Math.ceil(count / perPage));

  return (
    <div className="flex flex-col gap-6">
      {/* Filter bar */}
      <SectionReveal>
        <GlassCard>
          <GlassCardContent className="px-6 py-4">
            <InvoiceFilters />
          </GlassCardContent>
        </GlassCard>
      </SectionReveal>

      {/* Review recommendations */}
      {(recommendations.duplicates.length > 0 ||
        recommendations.mismatches.length > 0) && (
        <SectionReveal delay={0.02}>
          <ReviewRecommendations
            duplicates={recommendations.duplicates}
            mismatches={recommendations.mismatches}
          />
        </SectionReveal>
      )}

      {/* Invoice table or empty state */}
      {invoices.length === 0 ? (
        <EmptyState
          icon={<FileText className="size-6 text-muted-foreground" />}
          title="No invoices found"
          description="Try adjusting your filters or upload new invoices to get started."
          action={{ label: "Upload Invoices", href: "/upload" }}
        />
      ) : (
        <SectionReveal delay={0.03}>
          <InvoicesTableClient>
          <GlassCard>
          <div className="p-6">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border hover:bg-transparent">
                  <TableHead className="text-sm font-medium text-muted-foreground">
                    Invoice #
                  </TableHead>
                  <TableHead className="text-sm font-medium text-muted-foreground">
                    Vendor
                  </TableHead>
                  <TableHead className="text-sm font-medium text-muted-foreground">
                    Date
                  </TableHead>
                  <TableHead className="text-sm font-medium text-muted-foreground text-right">
                    Amount
                  </TableHead>
                  <TableHead className="text-sm font-medium text-muted-foreground">
                    Status
                  </TableHead>
                  <TableHead className="text-sm font-medium text-muted-foreground">
                    Source
                  </TableHead>
                  <TableHead className="text-sm font-medium text-muted-foreground">
                    Created
                  </TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <ClickableTableRow
                    key={invoice.id}
                    href={`/invoices/${invoice.id}`}
                    className="border-b border-border/50 hover:bg-muted/50"
                  >
                    <TableCell>
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
                      >
                        {invoice.invoice_number ?? invoice.original_filename}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-foreground">
                      {invoice.vendor_name ?? "\u2014"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(invoice.invoice_date)}
                    </TableCell>
                    <TableCell className="text-sm font-medium text-foreground text-right">
                      {formatCurrency(invoice.total_amount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <StatusBadge variant={statusToVariant(invoice.status)}>
                          {formatStatusLabel(invoice.status)}
                        </StatusBadge>
                        {invoice.duplicate_status === "suspected" && (
                          <span
                            className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800"
                            title="Possible duplicate"
                          >
                            <AlertTriangle className="size-3" aria-hidden="true" />
                            Dup
                          </span>
                        )}
                        {invoice.has_total_mismatch && (
                          <span
                            className="inline-flex items-center gap-0.5 rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-medium text-orange-800"
                            title="Total amount mismatch"
                          >
                            <AlertTriangle className="size-3" aria-hidden="true" />
                            Mismatch
                          </span>
                        )}
                        {invoice.normalization_status === "completed" &&
                          invoice.normalized_with_config_version != null &&
                          invoice.normalized_with_config_version < orgConfigVersion && (
                          <span
                            className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700"
                            title="Processed with older configuration"
                          >
                            <RefreshCw className="size-3" aria-hidden="true" />
                            Stale
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <SourceBadge source={invoice.source} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatRelativeTime(invoice.uploaded_at)}
                    </TableCell>
                    <TableCell>
                      <PreviewButton invoiceId={invoice.id} />
                    </TableCell>
                  </ClickableTableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination footer */}
          <div className="flex items-center justify-between border-t border-border/50 px-6 py-4">
            <p className="text-sm text-muted-foreground">
              Showing{" "}
              <span className="font-medium text-foreground">
                {(page - 1) * perPage + 1}
              </span>
              {" "}&ndash;{" "}
              <span className="font-medium text-foreground">
                {Math.min(page * perPage, count)}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">{count}</span>{" "}
              invoices
            </p>
            <InvoicesPagination
              currentPage={page}
              totalPages={totalPages}
            />
          </div>
          </GlassCard>
          </InvoicesTableClient>
        </SectionReveal>
      )}
    </div>
  );
}
