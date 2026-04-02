import type { DateRangePreset } from "@/types/analytics";

export const DEFAULT_RANGE: DateRangePreset = "30d";

/**
 * Resolve a date range preset to a start/end date pair and interval.
 * Shared between Server Components (data fetching) and Client Components
 * (date filter UI).
 */
export function resolveRange(range: DateRangePreset): {
  interval: string;
  startDate: string;
  endDate: string;
} {
  const end = new Date();
  const start = new Date();

  switch (range) {
    case "7d":
      start.setDate(end.getDate() - 7);
      return { interval: "day", startDate: fmt(start), endDate: fmt(end) };
    case "30d":
      start.setDate(end.getDate() - 30);
      return { interval: "week", startDate: fmt(start), endDate: fmt(end) };
    case "90d":
      start.setDate(end.getDate() - 90);
      return { interval: "week", startDate: fmt(start), endDate: fmt(end) };
    case "12m":
      start.setFullYear(end.getFullYear() - 1);
      return { interval: "month", startDate: fmt(start), endDate: fmt(end) };
  }
}

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}
