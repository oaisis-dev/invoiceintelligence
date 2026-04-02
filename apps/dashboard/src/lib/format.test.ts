import { describe, it, expect, vi, afterEach } from "vitest";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatRelativeTime,
} from "./format";

const DASH = "\u2014"; // em-dash

// ---------------------------------------------------------------------------
// formatCurrency
// ---------------------------------------------------------------------------

describe("formatCurrency", () => {
  it("formats a positive amount as USD", () => {
    expect(formatCurrency(1234.56)).toBe("$1,234.56");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("formats a negative amount", () => {
    // Intl.NumberFormat wraps negative currency values
    const result = formatCurrency(-50.5);
    expect(result).toContain("50.50");
  });

  it("pads to two decimal places", () => {
    expect(formatCurrency(100)).toBe("$100.00");
  });

  it("rounds to two decimal places", () => {
    expect(formatCurrency(9.999)).toBe("$10.00");
  });

  it("returns em-dash for null", () => {
    expect(formatCurrency(null)).toBe(DASH);
  });

  it("returns em-dash for undefined", () => {
    expect(formatCurrency(undefined)).toBe(DASH);
  });
});

// ---------------------------------------------------------------------------
// formatDate
// ---------------------------------------------------------------------------

describe("formatDate", () => {
  it("formats an ISO date string to short format", () => {
    // Date-only strings are parsed as UTC midnight; the local-tz formatter may
    // shift the day. Use a mid-day UTC timestamp to avoid ambiguity.
    const result = formatDate("2025-06-15T12:00:00Z");
    expect(result).toContain("Jun");
    expect(result).toContain("15");
    expect(result).toContain("2025");
  });

  it("formats a full ISO datetime string", () => {
    // Use a mid-day timestamp so the date doesn't shift across timezones
    const result = formatDate("2025-01-15T12:00:00Z");
    expect(result).not.toBe(DASH);
    expect(result).toContain("2025");
  });

  it("returns em-dash for null", () => {
    expect(formatDate(null)).toBe(DASH);
  });

  it("returns em-dash for undefined", () => {
    expect(formatDate(undefined)).toBe(DASH);
  });

  it("returns em-dash for empty string", () => {
    expect(formatDate("")).toBe(DASH);
  });

  it("returns em-dash for an invalid date string", () => {
    expect(formatDate("not-a-date")).toBe(DASH);
  });
});

// ---------------------------------------------------------------------------
// formatDateTime
// ---------------------------------------------------------------------------

describe("formatDateTime", () => {
  it("formats an ISO datetime string with time", () => {
    const result = formatDateTime("2025-06-15T14:30:00Z");
    expect(result).not.toBe(DASH);
    // Should include date and time parts
    expect(result).toContain("2025");
  });

  it("returns em-dash for null", () => {
    expect(formatDateTime(null)).toBe(DASH);
  });

  it("returns em-dash for undefined", () => {
    expect(formatDateTime(undefined)).toBe(DASH);
  });

  it("returns em-dash for empty string", () => {
    expect(formatDateTime("")).toBe(DASH);
  });

  it("returns em-dash for an invalid date string", () => {
    expect(formatDateTime("garbage")).toBe(DASH);
  });
});

// ---------------------------------------------------------------------------
// formatRelativeTime
// ---------------------------------------------------------------------------

describe("formatRelativeTime", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Helper: freeze Date.now() at a known point, then compute relative time
   * from an offset in the past.
   */
  function relativeFrom(msAgo: number): string {
    const now = new Date("2025-06-15T12:00:00Z").getTime();
    vi.useFakeTimers({ now });
    const past = new Date(now - msAgo).toISOString();
    return formatRelativeTime(past);
  }

  it("returns 'just now' for times less than a minute ago", () => {
    expect(relativeFrom(30_000)).toBe("just now"); // 30 seconds
  });

  it("returns 'just now' for 0 ms ago", () => {
    expect(relativeFrom(0)).toBe("just now");
  });

  it("returns singular minute", () => {
    expect(relativeFrom(60_000)).toBe("1 minute ago");
  });

  it("returns plural minutes", () => {
    expect(relativeFrom(5 * 60_000)).toBe("5 minutes ago");
  });

  it("returns singular hour", () => {
    expect(relativeFrom(60 * 60_000)).toBe("1 hour ago");
  });

  it("returns plural hours", () => {
    expect(relativeFrom(3 * 60 * 60_000)).toBe("3 hours ago");
  });

  it("returns singular day", () => {
    expect(relativeFrom(24 * 60 * 60_000)).toBe("1 day ago");
  });

  it("returns plural days", () => {
    expect(relativeFrom(5 * 24 * 60 * 60_000)).toBe("5 days ago");
  });

  it("returns singular week", () => {
    expect(relativeFrom(7 * 24 * 60 * 60_000)).toBe("1 week ago");
  });

  it("returns plural weeks", () => {
    expect(relativeFrom(3 * 7 * 24 * 60 * 60_000)).toBe("3 weeks ago");
  });

  it("returns singular month", () => {
    expect(relativeFrom(30 * 24 * 60 * 60_000)).toBe("1 month ago");
  });

  it("returns plural months", () => {
    expect(relativeFrom(90 * 24 * 60 * 60_000)).toBe("3 months ago");
  });

  it("returns singular year", () => {
    expect(relativeFrom(365 * 24 * 60 * 60_000)).toBe("1 year ago");
  });

  it("returns plural years", () => {
    expect(relativeFrom(2 * 365 * 24 * 60 * 60_000)).toBe("2 years ago");
  });

  it("returns 'just now' for a future date", () => {
    const now = new Date("2025-06-15T12:00:00Z").getTime();
    vi.useFakeTimers({ now });
    const future = new Date(now + 60_000).toISOString();
    expect(formatRelativeTime(future)).toBe("just now");
  });

  it("returns em-dash for an invalid date string", () => {
    expect(formatRelativeTime("invalid")).toBe(DASH);
  });
});
