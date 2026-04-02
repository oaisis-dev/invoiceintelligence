"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/format";
import {
  formatCompactCurrency,
  formatAxisDate,
  calculateYAxisWidth,
  CHART_COLORS,
} from "./chart-utils";
import type { SpendByPeriod } from "@/types/analytics";

interface SpendAreaChartProps {
  data: SpendByPeriod[];
  interval: string;
}

function CustomTooltip({
  active,
  payload,
  interval,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: SpendByPeriod }>;
  interval: string;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;

  return (
    <div className="rounded-lg border border-border-input bg-surface-primary p-3 shadow-md">
      <p className="text-[12px] text-text-secondary">
        {formatAxisDate(row.period_start, interval)}
      </p>
      <p className="text-[14px] font-semibold text-text-primary">
        {formatCurrency(row.total_amount)}
      </p>
      <p className="text-[12px] text-text-secondary">
        {row.invoice_count} invoice{row.invoice_count !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

export function SpendAreaChart({ data, interval }: SpendAreaChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-[14px] text-text-secondary">
        No spend data for this period
      </div>
    );
  }

  const maxAmount = Math.max(...data.map((d) => d.total_amount));
  const yAxisWidth = calculateYAxisWidth(maxAmount);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.2} />
            <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="hsl(var(--border))"
          vertical={false}
        />
        <XAxis
          dataKey="period_start"
          tickFormatter={(v: string) => formatAxisDate(v, interval)}
          tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
          dy={8}
        />
        <YAxis
          tickFormatter={formatCompactCurrency}
          tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
          width={yAxisWidth}
        />
        <Tooltip
          content={<CustomTooltip interval={interval} />}
          cursor={{ stroke: "hsl(var(--border))", strokeDasharray: "3 3" }}
        />
        <Area
          type="monotone"
          dataKey="total_amount"
          stroke={CHART_COLORS.primary}
          strokeWidth={2}
          fill="url(#spendGradient)"
          dot={false}
          activeDot={{
            r: 5,
            fill: CHART_COLORS.primary,
            stroke: "#fff",
            strokeWidth: 2,
          }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
