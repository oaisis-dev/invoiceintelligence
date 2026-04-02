import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InvoiceHistoryTimeline } from "./invoice-history-timeline";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe("InvoiceHistoryTimeline", () => {
  it("renders empty state when no history exists", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ history: [] }),
    } as Response);

    render(<InvoiceHistoryTimeline invoiceId="inv-1" />);

    await waitFor(() => {
      expect(
        screen.getByText("No history yet for this invoice.")
      ).toBeInTheDocument();
    });
  });

  it("renders timeline entries when history is returned", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        history: [
          {
            id: "a1",
            action: "invoice_uploaded",
            resource_type: "invoice",
            resource_id: "inv-1",
            changes: {},
            created_at: "2026-02-17T10:00:00Z",
            actor: { id: "u1", email: "ops@example.com", display_name: "Ops" },
          },
        ],
      }),
    } as Response);

    render(<InvoiceHistoryTimeline invoiceId="inv-1" />);

    await waitFor(() => {
      expect(screen.getByText("Invoice Uploaded")).toBeInTheDocument();
      expect(screen.getByText("Ops")).toBeInTheDocument();
    });
  });
});
