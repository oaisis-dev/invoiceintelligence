import Link from "next/link";
import { Suspense } from "react";
import {
  AlertTriangle,
  Bell,
  FileText,
  ClipboardCheck,
  Loader2,
  CheckCircle2,
  Upload,
  Mail,
  ArrowRight,
  TrendingUp,
  Building2,
  Activity,
} from "lucide-react";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardContent,
} from "@/components/ui/glass-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { StatusBadge } from "@/components/ui/status-badge";
import { SourceBadge } from "@/components/source-badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import {
  getDashboardStats,
  getRecentInvoices,
} from "@/lib/queries/invoices";
import {
  getSpendByPeriod,
  getSpendByVendor,
  getProcessingMetrics,
} from "@/lib/queries/analytics";
import { formatCurrency, formatDate } from "@/lib/format";
import { formatStatusLabel, statusToVariant } from "@/lib/invoice-status";
import type { DashboardStats, Invoice } from "@/types/database";
import type { DateRangePreset } from "@/types/analytics";
import { SectionReveal } from "@/components/ui/section-reveal";
import { SpendAreaChart } from "@/components/charts/spend-area-chart";
import { VendorBarChart } from "@/components/charts/vendor-bar-chart";
import { ProcessingLineChart } from "@/components/charts/processing-line-chart";
import { DashboardDateFilter } from "@/components/dashboard-date-filter";
import { DEFAULT_RANGE, resolveRange } from "@/lib/date-range";

// ---------------------------------------------------------------------------
// Stat cards
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
}

function StatCard({ label, value, subtitle, icon }: StatCardProps) {
  return (
    <GlassCard className="p-[25px]">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <span className="text-[14px] text-text-secondary">{label}</span>
          <span className="text-[30px] font-semibold leading-[36px] tracking-[0.4px] text-text-primary">
            {value}
          </span>
          <span className="text-[12px] text-text-secondary">{subtitle}</span>
        </div>
        <div className="flex size-12 items-center justify-center rounded-[12px] bg-primary-10">
          {icon}
        </div>
      </div>
    </GlassCard>
  );
}

function StatsGrid({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Total Invoices"
        value={stats.total.toLocaleString()}
        subtitle="All time"
        icon={
          <FileText className="size-6 text-primary" aria-hidden="true" />
        }
      />
      <StatCard
        label="Ready for Review"
        value={stats.pending.toLocaleString()}
        subtitle="Awaiting review"
        icon={
          <ClipboardCheck
            className="size-6 text-primary"
            aria-hidden="true"
          />
        }
      />
      <StatCard
        label="Processing"
        value={stats.queued.toLocaleString()}
        subtitle="In the pipeline"
        icon={
          <Loader2 className="size-6 text-primary" aria-hidden="true" />
        }
      />
      <StatCard
        label="Approved"
        value={stats.approved.toLocaleString()}
        subtitle={`${stats.exported} exported`}
        icon={
          <CheckCircle2
            className="size-6 text-primary"
            aria-hidden="true"
          />
        }
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recent invoices table
// ---------------------------------------------------------------------------

function RecentInvoicesTable({ invoices }: { invoices: Invoice[] }) {
  if (invoices.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="size-6 text-muted-foreground" />}
        title="No invoices yet"
        description="Upload your first invoice to get started with processing."
        action={{ label: "Upload Invoice", href: "/upload" }}
      />
    );
  }

  return (
    <GlassCard>
      <GlassCardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[18px] font-semibold text-text-primary">
              Recent Invoices
            </h2>
            <p className="mt-1 text-[14px] text-text-secondary">
              Latest invoice processing activity
            </p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/invoices">
              View All
              <ArrowRight className="ml-1 size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </GlassCardHeader>
      <GlassCardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border-input hover:bg-transparent">
              <TableHead className="text-[14px] font-medium tracking-[-0.15px] text-text-secondary">
                Invoice #
              </TableHead>
              <TableHead className="text-[14px] font-medium tracking-[-0.15px] text-text-secondary">
                Vendor
              </TableHead>
              <TableHead className="text-[14px] font-medium tracking-[-0.15px] text-text-secondary">
                Date
              </TableHead>
              <TableHead className="text-[14px] font-medium tracking-[-0.15px] text-text-secondary">
                Amount
              </TableHead>
              <TableHead className="text-[14px] font-medium tracking-[-0.15px] text-text-secondary">
                Status
              </TableHead>
              <TableHead className="text-[14px] font-medium tracking-[-0.15px] text-text-secondary">
                Source
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => (
              <ClickableTableRow
                key={invoice.id}
                href={`/invoices/${invoice.id}`}
                className="border-b border-border-table hover:bg-primary-05"
              >
                <TableCell className="text-[14px] font-medium text-text-primary">
                  <Link
                    href={`/invoices/${invoice.id}`}
                    className="hover:underline"
                  >
                    {invoice.invoice_number ?? invoice.original_filename}
                  </Link>
                </TableCell>
                <TableCell className="text-[14px] text-text-primary">
                  {invoice.vendor_name ?? "\u2014"}
                </TableCell>
                <TableCell className="text-[14px] text-text-secondary">
                  {formatDate(invoice.invoice_date)}
                </TableCell>
                <TableCell className="text-[14px] font-medium text-text-primary">
                  {formatCurrency(invoice.total_amount)}
                </TableCell>
                <TableCell>
                  <StatusBadge variant={statusToVariant(invoice.status)}>
                    {formatStatusLabel(invoice.status)}
                  </StatusBadge>
                </TableCell>
                <TableCell>
                  <SourceBadge source={invoice.source} />
                </TableCell>
              </ClickableTableRow>
            ))}
          </TableBody>
        </Table>
      </GlassCardContent>
    </GlassCard>
  );
}

// ---------------------------------------------------------------------------
// Quick actions + email summary
// ---------------------------------------------------------------------------

function QuickActionsCard({ emailCount }: { emailCount: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Quick Actions */}
      <GlassCard className="p-[25px]">
        <h2 className="text-[16px] font-semibold text-text-primary">
          Quick Actions
        </h2>
        <p className="mt-1 text-[14px] text-text-secondary">
          Common tasks to get you started
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/upload">
              <Upload className="mr-2 size-4" aria-hidden="true" />
              Upload Invoices
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/invoices">
              <FileText className="mr-2 size-4" aria-hidden="true" />
              View All Invoices
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/notifications">
              <Bell className="mr-2 size-4" aria-hidden="true" />
              Notifications
            </Link>
          </Button>
        </div>
      </GlassCard>

      {/* Recent Emails Summary */}
      <GlassCard className="p-[25px]">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[16px] font-semibold text-text-primary">
              Email Ingestion
            </h2>
            <p className="mt-1 text-[14px] text-text-secondary">
              Invoices received via email
            </p>
          </div>
          <div className="flex size-12 items-center justify-center rounded-[12px] bg-blue-50">
            <Mail className="size-6 text-blue-600" aria-hidden="true" />
          </div>
        </div>
        <div className="mt-4">
          <span className="text-[30px] font-semibold leading-[36px] tracking-[0.4px] text-text-primary">
            {emailCount.toLocaleString()}
          </span>
          <span className="ml-2 text-[14px] text-text-secondary">
            invoices from email
          </span>
        </div>
      </GlassCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_RANGES = new Set<string>(["7d", "30d", "90d", "12m"]);

function parseRange(raw: string | string[] | undefined): DateRangePreset {
  if (typeof raw === "string" && VALID_RANGES.has(raw)) {
    return raw as DateRangePreset;
  }
  return DEFAULT_RANGE;
}

// ---------------------------------------------------------------------------
// Page component (Server Component)
// ---------------------------------------------------------------------------

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const range = parseRange(params.range);
  const { interval, startDate, endDate } = resolveRange(range);

  const [stats, recentInvoices, spendByPeriod, spendByVendor, processingMetrics] =
    await Promise.all([
      getDashboardStats(),
      getRecentInvoices(5),
      getSpendByPeriod(interval, startDate, endDate),
      getSpendByVendor(startDate, endDate, 10),
      getProcessingMetrics(interval, startDate, endDate),
    ]);

  return (
    <div className="flex flex-col gap-6">
      {/* Stat cards */}
      <SectionReveal>
        <StatsGrid stats={stats} />
      </SectionReveal>

      {/* Duplicate alert — shown only when there are suspected duplicates */}
      {stats.suspected_duplicates > 0 && (
        <SectionReveal delay={0.03}>
          <GlassCard className="border-amber-200 bg-amber-50/50 p-[25px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-[12px] bg-amber-100">
                <AlertTriangle
                  className="size-5 text-amber-600"
                  aria-hidden="true"
                />
              </div>
              <div>
                <p className="text-[14px] font-medium text-amber-900">
                  {stats.suspected_duplicates} suspected{" "}
                  {stats.suspected_duplicates === 1
                    ? "duplicate"
                    : "duplicates"}
                </p>
                <p className="text-[12px] text-amber-700">
                  Review and resolve potential duplicate invoices
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild className="border-amber-300 text-amber-800 hover:bg-amber-100">
              <Link href="/invoices?duplicateStatus=suspected">
                Review Duplicates
                <ArrowRight className="ml-1 size-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
          </GlassCard>
        </SectionReveal>
      )}

      {/* Analytics charts */}
      <SectionReveal delay={0.04}>
        <div className="flex flex-col gap-6">
          {/* Spend trend */}
          <GlassCard>
            <GlassCardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-[12px] bg-primary-10">
                    <TrendingUp className="size-5 text-primary" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="text-[18px] font-semibold text-text-primary">
                      Spend Trend
                    </h2>
                    <p className="mt-0.5 text-[14px] text-text-secondary">
                      Total approved spend over time
                    </p>
                  </div>
                </div>
                <Suspense>
                  <DashboardDateFilter currentRange={range} />
                </Suspense>
              </div>
            </GlassCardHeader>
            <GlassCardContent>
              <SpendAreaChart data={spendByPeriod} interval={interval} />
            </GlassCardContent>
          </GlassCard>

          {/* Vendor breakdown + Processing metrics */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <GlassCard>
              <GlassCardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-[12px] bg-primary-10">
                    <Building2 className="size-5 text-primary" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="text-[18px] font-semibold text-text-primary">
                      Top Vendors
                    </h2>
                    <p className="mt-0.5 text-[14px] text-text-secondary">
                      By total spend
                    </p>
                  </div>
                </div>
              </GlassCardHeader>
              <GlassCardContent>
                <VendorBarChart data={spendByVendor} />
              </GlassCardContent>
            </GlassCard>

            <GlassCard>
              <GlassCardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-[12px] bg-primary-10">
                    <Activity className="size-5 text-primary" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="text-[18px] font-semibold text-text-primary">
                      Processing
                    </h2>
                    <p className="mt-0.5 text-[14px] text-text-secondary">
                      Volume and performance
                    </p>
                  </div>
                </div>
              </GlassCardHeader>
              <GlassCardContent>
                <ProcessingLineChart
                  data={processingMetrics}
                  interval={interval}
                />
              </GlassCardContent>
            </GlassCard>
          </div>
        </div>
      </SectionReveal>

      {/* Quick actions + email summary */}
      <SectionReveal delay={0.06}>
        <QuickActionsCard emailCount={stats.email_invoices} />
      </SectionReveal>

      {/* Recent invoices table */}
      <SectionReveal delay={0.08}>
        <RecentInvoicesTable invoices={recentInvoices} />
      </SectionReveal>
    </div>
  );
}
