import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe, toHaveNoViolations } from "jest-axe";
import type { DashboardStats, Invoice } from "@/types/database";

expect.extend(toHaveNoViolations);

vi.mock("@/lib/queries/invoices", () => ({
  getDashboardStats: vi.fn(),
  getRecentInvoices: vi.fn(),
}));

import { getDashboardStats, getRecentInvoices } from "@/lib/queries/invoices";
import DashboardPage from "./page";

const mockedGetDashboardStats = vi.mocked(getDashboardStats);
const mockedGetRecentInvoices = vi.mocked(getRecentInvoices);

const stats: DashboardStats = {
  total: 12,
  pending: 4,
  approved: 3,
  failed: 1,
  queued: 2,
  exported: 2,
  processed_today: 6,
  suspected_duplicates: 1,
  email_invoices: 5,
};

const invoices: Invoice[] = [
  {
    id: "inv-1",
    org_id: "org-1",
    location_id: null,
    status: "approved",
    processing_stage: null,
    source: "email",
    vendor_name: "US Foods",
    invoice_number: "INV-1",
    invoice_date: "2025-01-02",
    total_amount: 123,
    original_filename: "inv-1.pdf",
    stored_path: "/invoices/inv-1.pdf",
    metadata: {},
    raw_text: null,
    confidence_scores: null,
    error_message: null,
    uploaded_by: null,
    approved_by: null,
    uploaded_at: "2025-01-02T10:00:00Z",
    processed_at: null,
    approved_at: null,
    exported_at: null,
    rejection_note: null,
    progress: 100,
    duplicate_status: "none",
    duplicate_of: null,
    duplicate_group_id: null,
    created_at: "2025-01-02T10:00:00Z",
    updated_at: "2025-01-02T10:00:00Z",
  },
];

describe("DashboardPage accessibility", () => {
  it("has no obvious accessibility violations", async () => {
    mockedGetDashboardStats.mockResolvedValue(stats);
    mockedGetRecentInvoices.mockResolvedValue(invoices);

    const component = await DashboardPage();
    const { container } = render(component);

    const results = await axe(container, {
      rules: {
        // jsdom doesn't compute color contrast accurately
        "color-contrast": { enabled: false },
      },
    });

    expect(results).toHaveNoViolations();
  });
});
