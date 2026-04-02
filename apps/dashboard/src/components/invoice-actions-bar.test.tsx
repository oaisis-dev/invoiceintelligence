import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Invoice } from "@/types/database";

const refreshMock = vi.fn();
const pushMock = vi.fn();

const approveInvoiceMock = vi.fn();
const exportInvoiceMock = vi.fn();
const retryInvoiceMock = vi.fn();
const checkDuplicateMock = vi.fn();

const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();
const toastWarningMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    back: vi.fn(),
    refresh: refreshMock,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock("@/lib/api-client", () => ({
  approveInvoice: (...args: unknown[]) => approveInvoiceMock(...args),
  exportInvoice: (...args: unknown[]) => exportInvoiceMock(...args),
  retryInvoice: (...args: unknown[]) => retryInvoiceMock(...args),
  checkDuplicate: (...args: unknown[]) => checkDuplicateMock(...args),
}));

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
    warning: (...args: unknown[]) => toastWarningMock(...args),
  },
}));

import { InvoiceActionsBar } from "./invoice-actions-bar";

function makeInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: "inv-1",
    org_id: "org-1",
    location_id: null,
    status: "ready_for_review",
    processing_stage: null,
    source: "web_upload",
    vendor_name: "Vendor",
    invoice_number: "INV-1",
    invoice_date: "2026-02-16",
    total_amount: 100,
    original_filename: "inv.pdf",
    stored_path: "/invoices/inv.pdf",
    metadata: {},
    raw_text: null,
    confidence_scores: null,
    error_message: null,
    uploaded_by: null,
    approved_by: null,
    uploaded_at: "2026-02-16T10:00:00.000Z",
    processed_at: null,
    approved_at: null,
    exported_at: null,
    rejection_note: null,
    progress: 100,
    duplicate_status: "none",
    duplicate_of: null,
    duplicate_group_id: null,
    created_at: "2026-02-16T10:00:00.000Z",
    updated_at: "2026-02-16T10:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  approveInvoiceMock.mockResolvedValue(undefined);
  exportInvoiceMock.mockResolvedValue(new Blob(["ok"]));
  retryInvoiceMock.mockResolvedValue(undefined);
  checkDuplicateMock.mockResolvedValue({ duplicate_status: "none", match_count: 0 });
  global.URL.createObjectURL = vi.fn(() => "blob:download");
  global.URL.revokeObjectURL = vi.fn();
});

describe("InvoiceActionsBar", () => {
  it("enables approve only when invoice is ready_for_review", () => {
    const { rerender } = render(
      <InvoiceActionsBar
        invoice={makeInvoice({ status: "ready_for_review" })}
        onApprove={vi.fn()}
        onExport={vi.fn()}
        onReject={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "Approve" })).toBeEnabled();

    rerender(
      <InvoiceActionsBar
        invoice={makeInvoice({ status: "processing" })}
        onApprove={vi.fn()}
        onExport={vi.fn()}
        onReject={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "Approve" })).toBeDisabled();
  });

  it("refreshes from server truth after approve success", async () => {
    const user = userEvent.setup();
    const onApprove = vi.fn();

    render(
      <InvoiceActionsBar
        invoice={makeInvoice({ status: "ready_for_review" })}
        onApprove={onApprove}
        onExport={vi.fn()}
        onReject={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "Approve" }));

    await waitFor(() => {
      expect(approveInvoiceMock).toHaveBeenCalledWith("inv-1");
      expect(onApprove).toHaveBeenCalled();
      expect(refreshMock).toHaveBeenCalled();
      expect(toastSuccessMock).toHaveBeenCalledWith("Invoice approved successfully");
    });
  });

  it("allows export from approved and refreshes after success", async () => {
    const user = userEvent.setup();
    const onExport = vi.fn();

    render(
      <InvoiceActionsBar
        invoice={makeInvoice({ status: "approved" })}
        onApprove={vi.fn()}
        onExport={onExport}
        onReject={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "Export" }));

    await waitFor(() => {
      expect(exportInvoiceMock).toHaveBeenCalledWith("inv-1");
      expect(onExport).toHaveBeenCalled();
      expect(refreshMock).toHaveBeenCalled();
      expect(toastSuccessMock).toHaveBeenCalledWith("Invoice exported successfully");
    });
  });

  it("supports re-export from exported status with explicit success copy", async () => {
    const user = userEvent.setup();

    render(
      <InvoiceActionsBar
        invoice={makeInvoice({ status: "exported" })}
        onApprove={vi.fn()}
        onExport={vi.fn()}
        onReject={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "Export" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Export" }));

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith("Invoice re-exported successfully");
    });
  });

  it("surfaces actionable export failure messages", async () => {
    const user = userEvent.setup();
    exportInvoiceMock.mockRejectedValueOnce(new Error("Export blocked by external service"));

    render(
      <InvoiceActionsBar
        invoice={makeInvoice({ status: "approved" })}
        onApprove={vi.fn()}
        onExport={vi.fn()}
        onReject={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "Export" }));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith("Export blocked by external service");
    });
  });
});
