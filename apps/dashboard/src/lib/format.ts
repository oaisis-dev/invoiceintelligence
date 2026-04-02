// ---------------------------------------------------------------------------
// Formatting utilities for display values.
// All functions handle null/undefined gracefully, returning an em-dash.
// ---------------------------------------------------------------------------

const DASH = "\u2014"; // em-dash

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/**
 * Format a numeric amount as USD currency.
 * Returns "$1,234.56" or an em-dash for null/undefined.
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return DASH;
  return currencyFormatter.format(amount);
}

/**
 * Format an ISO date string as a short date.
 * Returns "Jan 15, 2026" or an em-dash for null/undefined.
 */
export function formatDate(date: string | null | undefined): string {
  if (!date) return DASH;
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return DASH;
  return dateFormatter.format(parsed);
}

/**
 * Format an ISO date string as date + time.
 * Returns "Jan 15, 2026 2:34 PM" or an em-dash for null/undefined.
 */
export function formatDateTime(date: string | null | undefined): string {
  if (!date) return DASH;
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return DASH;
  return dateTimeFormatter.format(parsed);
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

/**
 * Format an ISO date string as a relative time expression.
 * Returns "2 hours ago", "just now", "3 days ago", etc.
 */
export function formatRelativeTime(date: string): string {
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return DASH;

  const diff = Date.now() - parsed.getTime();

  if (diff < 0) return "just now";
  if (diff < MINUTE) return "just now";
  if (diff < HOUR) {
    const minutes = Math.floor(diff / MINUTE);
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }
  if (diff < DAY) {
    const hours = Math.floor(diff / HOUR);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  if (diff < WEEK) {
    const days = Math.floor(diff / DAY);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }
  if (diff < MONTH) {
    const weeks = Math.floor(diff / WEEK);
    return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  }
  if (diff < YEAR) {
    const months = Math.floor(diff / MONTH);
    return `${months} month${months === 1 ? "" : "s"} ago`;
  }
  const years = Math.floor(diff / YEAR);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}
