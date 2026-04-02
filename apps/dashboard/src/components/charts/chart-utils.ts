// ---------------------------------------------------------------------------
// Chart formatting utilities — compact currency labels for axes, dynamic
// Y-axis sizing, and date formatting for different intervals.
// ---------------------------------------------------------------------------

/**
 * Format a numeric value as a compact currency string for chart axes.
 * Examples: $0, $500, $1.2K, $45K, $1.2M
 */
export function formatCompactCurrency(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (abs >= 1_000_000) {
    const m = abs / 1_000_000;
    return `${sign}$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    const k = abs / 1_000;
    return `${sign}$${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}K`;
  }
  return `${sign}$${abs.toFixed(0)}`;
}

/**
 * Calculate a reasonable Y-axis width based on the maximum value so
 * that labels don't clip.
 */
export function calculateYAxisWidth(maxValue: number): number {
  const label = formatCompactCurrency(maxValue);
  // Approximate 8px per character + 16px padding
  return Math.max(48, label.length * 8 + 16);
}

/**
 * Format a date string for chart X-axis labels based on the interval.
 * - day   → "Mon 3/15"
 * - week  → "Mar 15"
 * - month → "Mar '26"
 */
export function formatAxisDate(dateStr: string, interval: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";

  if (interval === "day") {
    const day = d.toLocaleDateString("en-US", { weekday: "short" });
    return `${day} ${d.getMonth() + 1}/${d.getDate()}`;
  }
  if (interval === "month") {
    const month = d.toLocaleDateString("en-US", { month: "short" });
    const year = d.getFullYear().toString().slice(2);
    return `${month} '${year}`;
  }
  // week (default)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Chart color palette — matches the app's primary/accent tokens. */
export const CHART_COLORS = {
  primary: "hsl(var(--primary))",
  primaryLight: "hsl(var(--primary) / 0.15)",
  success: "#22c55e",
  danger: "#ef4444",
  warning: "#f59e0b",
  muted: "hsl(var(--muted-foreground))",
} as const;
