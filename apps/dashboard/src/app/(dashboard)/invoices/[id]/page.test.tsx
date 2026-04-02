import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  updateInvoice: vi.fn(),
  saveReviewCorrections: vi.fn().mockResolvedValue({}),
}));

import { useRouter } from "next/navigation";
import { updateInvoice } from "@/lib/api-client";
import { InvoiceReviewClient } from "./review-client";
import type { InvoiceWithLineItems } from "@/types/database";

const mockPush = vi.fn();
const mockRefresh = vi.fn();

const baseInvoice: InvoiceWithLineItems = {
  id: "inv-1",
  org_id: "org-1",
  location_id: null,
  status: "ready_for_review",
  processing_stage: null,
  source: "web_upload",
  vendor_name: "Sysco",
  invoice_number: "INV-100",
  invoice_date: "2026-02-15",
  total_amount: 125,
  original_filename: "invoice.pdf",
  stored_path: "invoices/inv-1/invoice.pdf",
  metadata: {},
  raw_text: null,
  confidence_scores: { vendor_name: 0.95 },
  error_message: null,
  uploaded_by: "user-1",
  approved_by: null,
  uploaded_at: "2026-02-15T00:00:00.000Z",
  processed_at: null,
  approved_at: null,
  exported_at: null,
  rejection_note: null,
  progress: 100,
  duplicate_status: "none",
  duplicate_of: null,
  duplicate_group_id: null,
  created_at: "2026-02-15T00:00:00.000Z",
  updated_at: "2026-02-15T00:00:00.000Z",
  line_items: [
    {
      id: "li-1",
      invoice_id: "inv-1",
      sort_order: 1,
      quantity: 1,
      size: null,
      unit: null,
      description: "Chicken Breast",
      item_code: null,
      unit_price: 125,
      extended_price: 125,
      category: "protein",
      account: 5000,
      sub_account: null,
      extra: {},
      created_at: "2026-02-15T00:00:00.000Z",
      updated_at: "2026-02-15T00:00:00.000Z",
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useRouter).mockReturnValue({
    push: mockPush,
    refresh: mockRefresh,
  } as never);
});

describe("Invoice review save flow", () => {
  it("saves metadata and line_items on Save button click", async () => {
    vi.mocked(updateInvoice).mockResolvedValue({
      ...baseInvoice,
      vendor_name: "Sysco Foods",
      updated_at: "2026-02-16T00:00:00.000Z",
    });

    render(
      <InvoiceReviewClient
        invoice={baseInvoice}
        documentUrl={null}
      />
    );

    // Edit vendor name
    const vendorInput = screen.getByLabelText(/Vendor Name/i);
    fireEvent.change(vendorInput, { target: { value: "Sysco Foods" } });

    // Switch to Line Items tab and edit a line item
    const user = userEvent.setup();
    await user.click(screen.getByRole("tab", { name: /Line Items/i }));

    await waitFor(() => {
      expect(screen.getByDisplayValue("Chicken Breast")).toBeInTheDocument();
    });

    const lineItemInput = screen.getByDisplayValue("Chicken Breast");
    fireEvent.change(lineItemInput, { target: { value: "Chicken Thigh" } });

    // Click Save
    fireEvent.click(screen.getByRole("button", { name: /Save/i }));

    await waitFor(() => {
      expect(updateInvoice).toHaveBeenCalledWith(
        "inv-1",
        expect.objectContaining({
          vendor_name: "Sysco Foods",
          line_items: expect.arrayContaining([
            expect.objectContaining({ description: "Chicken Thigh" }),
          ]),
        })
      );
    });

    expect(screen.getByText(/Saved/i)).toBeInTheDocument();
  });

  it("shows save error state when persistence fails", async () => {
    vi.mocked(updateInvoice).mockRejectedValue(new Error("save failed"));

    render(
      <InvoiceReviewClient
        invoice={baseInvoice}
        documentUrl={null}
      />
    );

    fireEvent.change(screen.getByLabelText(/Vendor Name/i), {
      target: { value: "Updated Vendor" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Save/i }));

    await waitFor(() => {
      expect(updateInvoice).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByText(/save failed/i)).toBeInTheDocument();
    });
  });
});
