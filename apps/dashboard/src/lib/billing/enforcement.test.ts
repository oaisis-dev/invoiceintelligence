import { describe, expect, it } from "vitest";
import {
  canUploadInvoices,
  canInviteUsers,
  isInGracePeriod,
  isSoftBlocked,
} from "./enforcement";
import type { SubscriptionUsage } from "@/types/database";

function makeUsage(overrides: Partial<SubscriptionUsage> = {}): SubscriptionUsage {
  return {
    monthlyInvoiceCount: 5,
    activeUserCount: 2,
    monthlyInvoiceLimit: 100,
    maxUsers: 10,
    workspaceType: "organization",
    planId: "plan-1",
    subscriptionStatus: "active",
    gracePeriodEnd: null,
    ...overrides,
  };
}

describe("canUploadInvoices", () => {
  it("allows upload when under limit", () => {
    const result = canUploadInvoices(makeUsage());
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(95);
  });

  it("blocks upload when at limit", () => {
    const result = canUploadInvoices(
      makeUsage({ monthlyInvoiceCount: 100, monthlyInvoiceLimit: 100 })
    );
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.reason).toContain("monthly limit");
  });

  it("blocks upload when over limit", () => {
    const result = canUploadInvoices(
      makeUsage({ monthlyInvoiceCount: 105, monthlyInvoiceLimit: 100 })
    );
    expect(result.allowed).toBe(false);
  });

  it("blocks upload when soft-blocked (grace period expired)", () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    const result = canUploadInvoices(
      makeUsage({ subscriptionStatus: "past_due", gracePeriodEnd: past })
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("grace period");
  });

  it("allows upload during active grace period", () => {
    const future = new Date(Date.now() + 86400000 * 7).toISOString();
    const result = canUploadInvoices(
      makeUsage({ subscriptionStatus: "past_due", gracePeriodEnd: future })
    );
    expect(result.allowed).toBe(true);
  });
});

describe("canInviteUsers", () => {
  it("allows invite when under limit", () => {
    const result = canInviteUsers(makeUsage());
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(8);
  });

  it("blocks invite when at limit", () => {
    const result = canInviteUsers(
      makeUsage({ activeUserCount: 10, maxUsers: 10 })
    );
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.reason).toContain("limit of 10 users");
  });

  it("blocks invite for individual workspace", () => {
    const result = canInviteUsers(
      makeUsage({ workspaceType: "individual" })
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Individual workspaces");
  });
});

describe("isInGracePeriod", () => {
  it("returns false for active subscription", () => {
    expect(isInGracePeriod(makeUsage())).toBe(false);
  });

  it("returns true when past_due with future grace end", () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    expect(
      isInGracePeriod(
        makeUsage({ subscriptionStatus: "past_due", gracePeriodEnd: future })
      )
    ).toBe(true);
  });

  it("returns false when past_due with expired grace end", () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    expect(
      isInGracePeriod(
        makeUsage({ subscriptionStatus: "past_due", gracePeriodEnd: past })
      )
    ).toBe(false);
  });

  it("returns false when past_due without grace period end", () => {
    expect(
      isInGracePeriod(
        makeUsage({ subscriptionStatus: "past_due", gracePeriodEnd: null })
      )
    ).toBe(false);
  });
});

describe("isSoftBlocked", () => {
  it("returns false for active subscription", () => {
    expect(isSoftBlocked(makeUsage())).toBe(false);
  });

  it("returns true when grace period expired", () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    expect(
      isSoftBlocked(
        makeUsage({ subscriptionStatus: "past_due", gracePeriodEnd: past })
      )
    ).toBe(true);
  });

  it("returns false when grace period still active", () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    expect(
      isSoftBlocked(
        makeUsage({ subscriptionStatus: "past_due", gracePeriodEnd: future })
      )
    ).toBe(false);
  });
});
