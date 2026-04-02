import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DocumentViewer } from "./document-viewer";

vi.mock("@/components/pdf-viewer", () => ({
  PdfViewer: ({ fileUrl }: { fileUrl: string | null }) => (
    <div data-testid="pdf-viewer">PDF:{fileUrl}</div>
  ),
}));

describe("DocumentViewer", () => {
  it("renders PDF viewer when documentKind is pdf", () => {
    render(
      <DocumentViewer
        documentUrl="/api/invoices/inv-1/pdf"
        documentKind="pdf"
      />
    );

    expect(screen.getByTestId("pdf-viewer")).toBeInTheDocument();
  });

  it("renders image when documentKind is image", () => {
    render(
      <DocumentViewer
        documentUrl="/api/invoices/inv-2/pdf"
        documentKind="image"
      />
    );

    expect(screen.getByAltText("Original invoice document")).toBeInTheDocument();
  });

  it("shows image-specific error when image fails to load", () => {
    render(
      <DocumentViewer
        documentUrl="/api/invoices/inv-3/pdf"
        documentKind="image"
      />
    );

    const image = screen.getByAltText("Original invoice document");
    fireEvent.error(image);

    expect(screen.getByText("Failed to load image")).toBeInTheDocument();
    expect(screen.queryByText("Failed to load PDF")).not.toBeInTheDocument();
  });

  it("shows neutral placeholder for unknown or missing document", () => {
    render(<DocumentViewer documentUrl={null} documentKind="unknown" />);

    expect(screen.getByText("No document preview available")).toBeInTheDocument();
    expect(screen.queryByText("Failed to load PDF")).not.toBeInTheDocument();
  });
});
