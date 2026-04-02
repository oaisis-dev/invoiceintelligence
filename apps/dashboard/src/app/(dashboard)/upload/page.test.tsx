import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock modules used by upload components
// ---------------------------------------------------------------------------

vi.mock("@/lib/api-client", () => ({
  uploadInvoices: vi.fn(),
  getInvoiceStatus: vi.fn(),
}));

// Mock sonner to prevent portal issues
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock the email inbox query module so the async EmailIngestionSection
// doesn't trigger real Supabase calls when rendering the full page
vi.mock("@/lib/queries/email-inbox", () => ({
  getEmailIngestions: vi.fn().mockResolvedValue({ data: [], count: 0 }),
}));

import { UploadSection } from "./upload-section";
import { getInvoiceStatus, uploadInvoices } from "@/lib/api-client";

beforeEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("UploadSection", () => {
  describe("Upload Invoices section", () => {
    it("renders 'Upload Invoices' heading", () => {
      render(<UploadSection />);
      expect(screen.getByText("Upload Invoices")).toBeInTheDocument();
    });

    it("renders drop zone with descriptive text", () => {
      render(<UploadSection />);
      expect(
        screen.getByText("Drop your files here")
      ).toBeInTheDocument();
    });

    it("renders supported formats text", () => {
      render(<UploadSection />);
      expect(
        screen.getByText(/PDF, PNG, JPG, or TIFF/i)
      ).toBeInTheDocument();
    });

    it("renders Browse Files button", () => {
      render(<UploadSection />);
      expect(
        screen.getByRole("button", { name: /browse files/i })
      ).toBeInTheDocument();
    });

    it("has a hidden file input accepting multiple formats", () => {
      const { container } = render(<UploadSection />);
      const fileInput = container.querySelector(
        "input[type='file']"
      ) as HTMLInputElement;
      expect(fileInput).toBeTruthy();
      expect(fileInput.accept).toBe(".pdf,.png,.jpg,.jpeg,.tiff,.tif");
    });

    it("renders an upload icon (Lucide Upload)", () => {
      const { container } = render(<UploadSection />);
      const dropZone = container.querySelector("[data-testid='drop-zone']");
      expect(dropZone).toBeTruthy();
      const svg = dropZone?.querySelector("svg");
      expect(svg).toBeTruthy();
    });

    it("opens file dialog when Browse Files button is clicked", () => {
      const { container } = render(<UploadSection />);
      const fileInput = container.querySelector(
        "input[type='file']"
      ) as HTMLInputElement;
      const clickSpy = vi.spyOn(fileInput, "click");

      const browseButton = screen.getByRole("button", {
        name: /browse files/i,
      });
      fireEvent.click(browseButton);

      expect(clickSpy).toHaveBeenCalled();
    });

    it("applies dashed border styling to drop zone", () => {
      const { container } = render(<UploadSection />);
      const dropZone = container.querySelector("[data-testid='drop-zone']");
      expect(dropZone).toBeTruthy();
      expect(dropZone).toHaveClass("border-dashed");
      expect(dropZone).toHaveClass("border-2");
    });

    it("renders a GlassCard container", () => {
      const { container } = render(<UploadSection />);
      const glassCards = container.querySelectorAll(
        "[data-slot='glass-card']"
      );
      expect(glassCards.length).toBe(1);
    });
  });

  describe("drag and drop behavior", () => {
    it("highlights drop zone on dragover", () => {
      const { container } = render(<UploadSection />);
      const dropZone = container.querySelector(
        "[data-testid='drop-zone']"
      ) as HTMLElement;

      fireEvent.dragOver(dropZone, {
        dataTransfer: { types: ["Files"] },
      });

      expect(dropZone).toHaveAttribute("data-dragging", "true");
    });

    it("removes highlight on dragleave", () => {
      const { container } = render(<UploadSection />);
      const dropZone = container.querySelector(
        "[data-testid='drop-zone']"
      ) as HTMLElement;

      fireEvent.dragOver(dropZone, {
        dataTransfer: { types: ["Files"] },
      });
      fireEvent.dragLeave(dropZone);

      expect(dropZone).toHaveAttribute("data-dragging", "false");
    });
  });

  describe("file validation", () => {
    it("rejects files over 10MB", async () => {
      const { container } = render(<UploadSection />);
      const fileInput = container.querySelector(
        "input[type='file']"
      ) as HTMLInputElement;

      const largeFile = new File(["x".repeat(100)], "big.pdf", {
        type: "application/pdf",
      });
      Object.defineProperty(largeFile, "size", {
        value: 11 * 1024 * 1024,
      });

      fireEvent.change(fileInput, { target: { files: [largeFile] } });

      await waitFor(() => {
        expect(
          screen.getByText(/exceeds/i)
        ).toBeInTheDocument();
      });
    });

    it("rejects unsupported file types", async () => {
      const { container } = render(<UploadSection />);
      const fileInput = container.querySelector(
        "input[type='file']"
      ) as HTMLInputElement;

      const txtFile = new File(["hello"], "test.txt", {
        type: "text/plain",
      });

      fireEvent.change(fileInput, { target: { files: [txtFile] } });

      await waitFor(() => {
        expect(
          screen.getByText(/not an accepted file type/i)
        ).toBeInTheDocument();
      });
    });

    it("accepts valid PDF files", async () => {
      const { container } = render(<UploadSection />);
      const fileInput = container.querySelector(
        "input[type='file']"
      ) as HTMLInputElement;

      const pdfFile = new File(["pdf content"], "invoice.pdf", {
        type: "application/pdf",
      });
      Object.defineProperty(pdfFile, "size", { value: 1024 * 1024 });

      fireEvent.change(fileInput, { target: { files: [pdfFile] } });

      await waitFor(() => {
        expect(screen.getByText("invoice.pdf")).toBeInTheDocument();
      });
    });
  });

  describe("file upload progress cards", () => {
    it("shows file card after selecting a valid file", async () => {
      const { container } = render(<UploadSection />);
      const fileInput = container.querySelector(
        "input[type='file']"
      ) as HTMLInputElement;

      const pdfFile = new File(["pdf content"], "invoice.pdf", {
        type: "application/pdf",
      });
      Object.defineProperty(pdfFile, "size", { value: 2 * 1024 * 1024 });

      fireEvent.change(fileInput, { target: { files: [pdfFile] } });

      await waitFor(() => {
        expect(screen.getByText("invoice.pdf")).toBeInTheDocument();
        expect(screen.getByText("2.0 MB")).toBeInTheDocument();
      });
    });

    it("shows remove button on file cards", async () => {
      const { container } = render(<UploadSection />);
      const fileInput = container.querySelector(
        "input[type='file']"
      ) as HTMLInputElement;

      const pdfFile = new File(["pdf content"], "invoice.pdf", {
        type: "application/pdf",
      });
      Object.defineProperty(pdfFile, "size", { value: 1024 * 1024 });

      fireEvent.change(fileInput, { target: { files: [pdfFile] } });

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /remove invoice\.pdf/i })
        ).toBeInTheDocument();
      });
    });

    it("removes file card when remove button is clicked", async () => {
      const { container } = render(<UploadSection />);
      const fileInput = container.querySelector(
        "input[type='file']"
      ) as HTMLInputElement;

      const pdfFile = new File(["pdf content"], "invoice.pdf", {
        type: "application/pdf",
      });
      Object.defineProperty(pdfFile, "size", { value: 1024 * 1024 });

      fireEvent.change(fileInput, { target: { files: [pdfFile] } });

      await waitFor(() => {
        expect(screen.getByText("invoice.pdf")).toBeInTheDocument();
      });

      const removeButton = screen.getByRole("button", {
        name: /remove invoice\.pdf/i,
      });
      fireEvent.click(removeButton);

      expect(screen.queryByText("invoice.pdf")).not.toBeInTheDocument();
    });

    it("preserves mixed upload results and surfaces backend errors per file", async () => {
      const mockedUploadInvoices = vi.mocked(uploadInvoices);
      const mockedGetInvoiceStatus = vi.mocked(getInvoiceStatus);
      mockedUploadInvoices.mockResolvedValue({
        uploaded: 1,
        invoiceIds: ["inv_ok"],
        results: [
          {
            fileName: "ok.pdf",
            invoiceId: "inv_ok",
            status: "queued",
          },
          {
            fileName: "bad.pdf",
            status: "failed",
            error: "Duplicate invoice",
          },
        ],
      });
      mockedGetInvoiceStatus.mockResolvedValue({
        id: "inv_ok",
        status: "queued",
        progress: 10,
      });

      const { container } = render(<UploadSection />);
      const fileInput = container.querySelector(
        "input[type='file']"
      ) as HTMLInputElement;
      const fileA = new File(["pdf-a"], "ok.pdf", { type: "application/pdf" });
      const fileB = new File(["pdf-b"], "bad.pdf", { type: "application/pdf" });

      fireEvent.change(fileInput, { target: { files: [fileA, fileB] } });

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /upload 2 files/i })
        ).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /upload 2 files/i }));

      await waitFor(() => {
        expect(screen.getByText("ok.pdf")).toBeInTheDocument();
        expect(screen.getByText("bad.pdf")).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText(/Duplicate invoice/i)).toBeInTheDocument();
      });
      await waitFor(() => {
        expect(mockedGetInvoiceStatus).toHaveBeenCalledWith("inv_ok");
      });
    });

    it("polls status and updates file progression to terminal state", async () => {
      const mockedUploadInvoices = vi.mocked(uploadInvoices);
      const mockedGetInvoiceStatus = vi.mocked(getInvoiceStatus);
      const setIntervalSpy = vi.spyOn(window, "setInterval");
      const clearIntervalSpy = vi.spyOn(window, "clearInterval");
      mockedUploadInvoices.mockResolvedValue({
        uploaded: 1,
        invoiceIds: ["inv_progress"],
        results: [
          {
            fileName: "progress.pdf",
            invoiceId: "inv_progress",
            status: "queued",
          },
        ],
      });
      mockedGetInvoiceStatus
        .mockResolvedValueOnce({
          id: "inv_progress",
          status: "processing",
          progress: 65,
        })
        .mockResolvedValueOnce({
          id: "inv_progress",
          status: "ready_for_review",
          progress: 100,
        });

      const { container } = render(<UploadSection />);
      const fileInput = container.querySelector(
        "input[type='file']"
      ) as HTMLInputElement;
      const file = new File(["pdf"], "progress.pdf", { type: "application/pdf" });

      fireEvent.change(fileInput, { target: { files: [file] } });

      fireEvent.click(screen.getByRole("button", { name: /upload 1 file/i }));

      await waitFor(() => {
        expect(mockedUploadInvoices).toHaveBeenCalled();
        expect(mockedGetInvoiceStatus).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByText(/Completed/i)).toBeInTheDocument();
      });
      expect(
        screen.getByRole("link", { name: /open invoice/i })
      ).toBeInTheDocument();

      setIntervalSpy.mockRestore();
      clearIntervalSpy.mockRestore();
    });

    it("shows polling fallback error without dropping successful uploads", async () => {
      const mockedUploadInvoices = vi.mocked(uploadInvoices);
      const mockedGetInvoiceStatus = vi.mocked(getInvoiceStatus);
      let intervalHandler: TimerHandler | null = null;
      const setIntervalSpy = vi
        .spyOn(window, "setInterval")
        .mockImplementation((handler) => {
          intervalHandler = handler;
          return 1 as unknown as number;
        });
      const clearIntervalSpy = vi
        .spyOn(window, "clearInterval")
        .mockImplementation(() => {});
      mockedUploadInvoices.mockResolvedValue({
        uploaded: 1,
        invoiceIds: ["inv_stuck"],
        results: [
          {
            fileName: "stuck.pdf",
            invoiceId: "inv_stuck",
            status: "queued",
          },
        ],
      });
      mockedGetInvoiceStatus.mockRejectedValue(new Error("network down"));

      const { container } = render(<UploadSection />);
      const fileInput = container.querySelector(
        "input[type='file']"
      ) as HTMLInputElement;
      const file = new File(["pdf"], "stuck.pdf", { type: "application/pdf" });

      fireEvent.change(fileInput, { target: { files: [file] } });

      fireEvent.click(screen.getByRole("button", { name: /upload 1 file/i }));

      await waitFor(() => {
        expect(mockedUploadInvoices).toHaveBeenCalled();
        expect(typeof intervalHandler).toBe("function");
      });

      await act(async () => {
        await (intervalHandler as () => Promise<void>)();
        await (intervalHandler as () => Promise<void>)();
        await (intervalHandler as () => Promise<void>)();
      });

      await waitFor(() => {
        expect(screen.getByText("stuck.pdf")).toBeInTheDocument();
        expect(
          screen.getByText(/Status updates unavailable/i)
        ).toBeInTheDocument();
      });

      setIntervalSpy.mockRestore();
      clearIntervalSpy.mockRestore();
    });
  });
});
