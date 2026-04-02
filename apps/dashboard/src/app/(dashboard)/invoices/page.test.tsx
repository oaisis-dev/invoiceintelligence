import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Invoice, InvoiceStatus } from "@/types/database";

vi.mock("@/lib/queries/invoices", () => ({
  getInvoices: vi.fn(),
  getReviewRecommendations: vi.fn(),
}));

import { getInvoices, getReviewRecommendations } from "@/lib/queries/invoices";
import InvoicesPage from "./page";

const mockedGetInvoices = vi.mocked(getInvoices);
const mockedGetReviewRecommendations = vi.mocked(getReviewRecommendations);

function makeInvoice(id: string, status: InvoiceStatus): Invoice {
  return {
    id,
    org_id: "org-1",
    location_id: null,
    status,
    processing_stage: null,
    source: "web_upload",
    vendor_name: `Vendor ${id}`,
    invoice_number: `INV-${id}`,
    invoice_date: "2026-01-12",
    total_amount: 120,
    original_filename: `invoice-${id}.pdf`,
    stored_path: `invoices/${id}.pdf`,
    metadata: {},
    raw_text: null,
    confidence_scores: null,
    error_message: null,
    uploaded_by: null,
    approved_by: null,
    uploaded_at: "2026-01-12T10:00:00Z",
    processed_at: null,
    approved_at: null,
    exported_at: null,
    rejection_note: null,
    progress: 100,
    duplicate_status: "none",
    duplicate_of: null,
    duplicate_group_id: null,
    has_total_mismatch: false,
    created_at: "2026-01-12T10:00:00Z",
    updated_at: "2026-01-12T10:00:00Z",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedGetReviewRecommendations.mockResolvedValue({
    duplicates: [],
    mismatches: [],
  });
});

describe("InvoicesPage", () => {
  it("passes status/vendor/date/search filter params to getInvoices", async () => {
    mockedGetInvoices.mockResolvedValue({ data: [], count: 0 });

    const Component = await InvoicesPage({
      searchParams: Promise.resolve({
        status: "processing",
        source: "email",
        search: "shrimp",
        dateFrom: "2026-01-01",
        dateTo: "2026-01-31",
        duplicateStatus: "suspected",
        page: "2",
        limit: "10",
      }),
    });

    render(Component);

    expect(mockedGetInvoices).toHaveBeenCalledWith({
      status: "processing",
      source: "email",
      search: "shrimp",
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
      duplicateStatus: "suspected",
      page: 2,
      perPage: 10,
    });
  });

  it("renders status badges for all 8 canonical statuses", async () => {
    const statuses: InvoiceStatus[] = [
      "uploaded",
      "queued",
      "processing",
      "ready_for_review",
      "failed",
      "cancelled",
      "approved",
      "exported",
    ];

    mockedGetInvoices.mockResolvedValue({
      data: statuses.map((status, index) => makeInvoice(String(index + 1), status)),
      count: statuses.length,
    });

    const Component = await InvoicesPage({ searchParams: Promise.resolve({}) });
    const { container } = render(Component);

    const badgeLabels = Array.from(
      container.querySelectorAll("[data-slot='status-badge']")
    ).map((node) => node.textContent?.trim());

    expect(badgeLabels).toEqual(
      expect.arrayContaining([
        "Uploaded",
        "Queued",
        "Processing",
        "Ready for Review",
        "Failed",
        "Cancelled",
        "Approved",
        "Exported",
      ])
    );
    expect(badgeLabels).toHaveLength(8);
  });

  it("keeps row navigation links pointing to invoice detail pages", async () => {
    mockedGetInvoices.mockResolvedValue({
      data: [makeInvoice("abc123", "ready_for_review")],
      count: 1,
    });

    const Component = await InvoicesPage({ searchParams: Promise.resolve({}) });
    render(Component);

    const invoiceLink = screen.getByRole("link", { name: "INV-abc123" });
    expect(invoiceLink).toHaveAttribute("href", "/invoices/abc123");
  });
});
