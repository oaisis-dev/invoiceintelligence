"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatAxisDate, CHART_COLORS } from "./chart-utils";
import type { ProcessingMetric } from "@/types/analytics";

interface ProcessingLineChartProps {
  data: ProcessingMetric[];
  interval: string;
}

function CustomTooltip({
  active,
  payload,
  interval,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; payload: ProcessingMetric }>;
  interval: string;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;

  return (
    <div className="rounded-lg border border-border-input bg-surface-primary p-3 shadow-md">
      <p className="text-[12px] text-text-secondary">
        {formatAxisDate(row.period_start, interval)}
      </p>
      <div className="mt-1 space-y-0.5">
        <p className="text-[13px] text-text-primary">
          <span className="inline-block size-2 rounded-full bg-[#22c55e]" />{" "}
          Processed: {row.processed_count}
        </p>
        <p className="text-[13px] text-text-primary">
          <span className="inline-block size-2 rounded-full bg-[#ef4444]" />{" "}
          Failed: {row.failed_count}
        </p>
        {row.avg_processing_minutes != null && (
          <p className="text-[13px] text-text-primary">
            <span className="inline-block size-2 rounded-full bg-[#f59e0b]" />{" "}
            Avg time: {row.avg_processing_minutes.toFixed(1)} min
          </p>
        )}
      </div>
    </div>
  );
}

export function ProcessingLineChart({
  data,
  interval,
}: ProcessingLineChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-[14px] text-text-secondary">
        No processing data for this period
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart
        data={data}
        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
      >
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
          yAxisId="count"
          tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <YAxis
          yAxisId="minutes"
          orientation="right"
          tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
          width={40}
          tickFormatter={(v: number) => `${v}m`}
        />
        <Tooltip content={<CustomTooltip interval={interval} />} />
        <Legend
          verticalAlign="top"
          height={28}
          iconSize={8}
          wrapperStyle={{ fontSize: 12 }}
        />
        <Bar
          yAxisId="count"
          dataKey="processed_count"
          name="Processed"
          fill={CHART_COLORS.success}
          radius={[3, 3, 0, 0]}
          barSize={20}
        />
        <Bar
          yAxisId="count"
          dataKey="failed_count"
          name="Failed"
          fill={CHART_COLORS.danger}
          radius={[3, 3, 0, 0]}
          barSize={20}
        />
        <Line
          yAxisId="minutes"
          type="monotone"
          dataKey="avg_processing_minutes"
          name="Avg Time (min)"
          stroke={CHART_COLORS.warning}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: CHART_COLORS.warning }}
          connectNulls
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
