import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DashboardStats, Invoice } from "@/types/database";

// ---------------------------------------------------------------------------
// Mock the Supabase query layer used by the server component
// ---------------------------------------------------------------------------

const mockStats: DashboardStats = {
  total: 127,
  pending: 8,
  approved: 12,
  failed: 3,
  queued: 5,
  exported: 9,
  processed_today: 23,
  suspected_duplicates: 0,
  email_invoices: 2,
};

const mockInvoices: Invoice[] = [
  {
    id: "1",
    org_id: "org-1",
    location_id: null,
    status: "approved",
    processing_stage: null,
    source: "web_upload",
    vendor_name: "US Foods",
    invoice_number: "INV-001",
    invoice_date: "2024-12-15",
    total_amount: 2450.0,
    original_filename: "inv001.pdf",
    stored_path: "/invoices/inv001.pdf",
    metadata: {},
    raw_text: null,
    confidence_scores: null,
    error_message: null,
    uploaded_by: null,
    approved_by: null,
    uploaded_at: "2024-12-15T10:00:00Z",
    processed_at: null,
    approved_at: null,
    exported_at: null,
    rejection_note: null,
    progress: 100,
    created_at: "2024-12-15T10:00:00Z",
    updated_at: "2024-12-15T10:00:00Z",
  },
  {
    id: "2",
    org_id: "org-1",
    location_id: null,
    status: "ready_for_review",
    processing_stage: null,
    source: "email",
    vendor_name: "Sysco Corp",
    invoice_number: "INV-002",
    invoice_date: "2024-12-14",
    total_amount: 1890.5,
    original_filename: "inv002.pdf",
    stored_path: "/invoices/inv002.pdf",
    metadata: {},
    raw_text: null,
    confidence_scores: null,
    error_message: null,
    uploaded_by: null,
    approved_by: null,
    uploaded_at: "2024-12-14T10:00:00Z",
    processed_at: null,
    approved_at: null,
    exported_at: null,
    rejection_note: null,
    progress: 100,
    created_at: "2024-12-14T10:00:00Z",
    updated_at: "2024-12-14T10:00:00Z",
  },
];

vi.mock("@/lib/queries/invoices", () => ({
  getDashboardStats: vi.fn(),
  getRecentInvoices: vi.fn(),
}));

import {
  getDashboardStats,
  getRecentInvoices,
} from "@/lib/queries/invoices";
import DashboardPage from "./page";

const mockedGetStats = vi.mocked(getDashboardStats);
const mockedGetRecentInvoices = vi.mocked(getRecentInvoices);

function setupMocks() {
  mockedGetStats.mockResolvedValue(mockStats);
  mockedGetRecentInvoices.mockResolvedValue(mockInvoices);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DashboardPage", () => {
  describe("stat cards", () => {
    it("renders stat cards with correct labels", async () => {
      setupMocks();
      const Component = await DashboardPage();
      render(Component);

      expect(screen.getByText("Total Invoices")).toBeInTheDocument();
      // "Ready for Review" may also appear as a status badge, so use getAllByText
      expect(screen.getAllByText("Ready for Review").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Processing").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Approved").length).toBeGreaterThanOrEqual(1);
    });

    it("displays stat values", async () => {
      setupMocks();
      const Component = await DashboardPage();
      render(Component);

      expect(screen.getByText("127")).toBeInTheDocument(); // total
      expect(screen.getByText("8")).toBeInTheDocument(); // pending
      expect(screen.getByText("5")).toBeInTheDocument(); // queued
      expect(screen.getByText("12")).toBeInTheDocument(); // approved
    });

    it("displays subtitles for stat cards", async () => {
      setupMocks();
      const Component = await DashboardPage();
      render(Component);

      expect(screen.getByText("All time")).toBeInTheDocument();
      expect(screen.getByText("Awaiting review")).toBeInTheDocument();
      expect(screen.getByText("In the pipeline")).toBeInTheDocument();
      expect(screen.getByText("9 exported")).toBeInTheDocument();
    });

    it("uses GlassCard components for stat cards", async () => {
      setupMocks();
      const Component = await DashboardPage();
      const { container } = render(Component);

      const glassCards = container.querySelectorAll(
        "[data-slot='glass-card']"
      );
      // 4 stat cards + quick actions card + email ingestion card + recent invoices card
      expect(glassCards.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe("recent invoices table", () => {
    it("renders table header with correct columns", async () => {
      setupMocks();
      const Component = await DashboardPage();
      render(Component);

      expect(screen.getByText("Invoice #")).toBeInTheDocument();
      expect(screen.getByText("Vendor")).toBeInTheDocument();
      expect(screen.getByText("Date")).toBeInTheDocument();
      expect(screen.getByText("Amount")).toBeInTheDocument();
      expect(screen.getByText("Status")).toBeInTheDocument();
      expect(screen.getByText("Source")).toBeInTheDocument();
    });

    it("renders section heading and subtitle", async () => {
      setupMocks();
      const Component = await DashboardPage();
      render(Component);

      expect(screen.getByText("Recent Invoices")).toBeInTheDocument();
      expect(
        screen.getByText("Latest invoice processing activity")
      ).toBeInTheDocument();
    });

    it("renders invoice rows from query response", async () => {
      setupMocks();
      const Component = await DashboardPage();
      render(Component);

      expect(screen.getByText("INV-001")).toBeInTheDocument();
      expect(screen.getByText("US Foods")).toBeInTheDocument();
      expect(screen.getByText("INV-002")).toBeInTheDocument();
      expect(screen.getByText("Sysco Corp")).toBeInTheDocument();
    });

    it("renders status badges", async () => {
      setupMocks();
      const Component = await DashboardPage();
      const { container } = render(Component);

      const statusBadges = container.querySelectorAll(
        "[data-slot='status-badge']"
      );
      expect(statusBadges.length).toBe(2);
    });

    it("formats amounts with dollar sign and commas", async () => {
      setupMocks();
      const Component = await DashboardPage();
      render(Component);

      expect(screen.getByText("$2,450.00")).toBeInTheDocument();
      expect(screen.getByText("$1,890.50")).toBeInTheDocument();
    });
  });

  describe("query integration", () => {
    it("calls getDashboardStats", async () => {
      setupMocks();
      await DashboardPage();

      expect(mockedGetStats).toHaveBeenCalledOnce();
    });

    it("calls getRecentInvoices for recent invoices", async () => {
      setupMocks();
      await DashboardPage();

      expect(mockedGetRecentInvoices).toHaveBeenCalledWith(5);
    });

  });

  describe("empty state", () => {
    it("renders empty state when no invoices", async () => {
      mockedGetStats.mockResolvedValue(mockStats);
      mockedGetRecentInvoices.mockResolvedValue([]);
      const Component = await DashboardPage();
      render(Component);

      expect(screen.getByText("No invoices yet")).toBeInTheDocument();
    });
  });
});
