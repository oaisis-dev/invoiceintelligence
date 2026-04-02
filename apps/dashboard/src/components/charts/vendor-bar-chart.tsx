"use client";

import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { formatCurrency } from "@/lib/format";
import { formatCompactCurrency, calculateYAxisWidth, CHART_COLORS } from "./chart-utils";
import type { VendorSpend } from "@/types/analytics";

interface VendorBarChartProps {
  data: VendorSpend[];
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: VendorSpend }>;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;

  return (
    <div className="rounded-lg border border-border-input bg-surface-primary p-3 shadow-md">
      <p className="text-[14px] font-semibold text-text-primary">
        {row.vendor_name}
      </p>
      <p className="text-[13px] text-text-primary">
        {formatCurrency(row.total_amount)}
      </p>
      <p className="text-[12px] text-text-secondary">
        {row.invoice_count} invoice{row.invoice_count !== 1 ? "s" : ""} &middot;{" "}
        {row.pct_of_total}% of total
      </p>
    </div>
  );
}

export function VendorBarChart({ data }: VendorBarChartProps) {
  const router = useRouter();

  if (data.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-[14px] text-text-secondary">
        No vendor data for this period
      </div>
    );
  }

  const maxAmount = Math.max(...data.map((d) => d.total_amount));
  const xAxisWidth = calculateYAxisWidth(maxAmount);
  // Truncate long vendor names for the Y-axis
  const chartData = data.map((d) => ({
    ...d,
    short_name:
      d.vendor_name.length > 18
        ? d.vendor_name.slice(0, 16) + "…"
        : d.vendor_name,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="hsl(var(--border))"
          horizontal={false}
        />
        <XAxis
          type="number"
          tickFormatter={formatCompactCurrency}
          tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
          width={xAxisWidth}
        />
        <YAxis
          type="category"
          dataKey="short_name"
          tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
          width={120}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--primary) / 0.05)" }} />
        <Bar
          dataKey="total_amount"
          radius={[0, 4, 4, 0]}
          onClick={(_data: unknown, index: number) => {
            const vendor = chartData[index];
            if (vendor) {
              router.push(
                `/invoices?search=${encodeURIComponent(vendor.vendor_name)}`,
              );
            }
          }}
          style={{ cursor: "pointer" }}
        >
          {chartData.map((_, index) => (
            <Cell key={index} fill={CHART_COLORS.primary} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
