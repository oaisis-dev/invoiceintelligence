import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { InvoicesTable } from "./invoices-table";
import type { Invoice } from "@/types/database";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
    useRouter: () => ({
        push: mockPush,
    }),
}));

describe("InvoicesTable", () => {
    const mockInvoices: Invoice[] = [
        {
            id: "inv-1",
            invoice_number: "INV-001",
            vendor_name: "Test Vendor",
            invoice_date: "2025-01-01",
            total_amount: 100.0,
            status: "ready_for_review",
            source: "email",
            uploaded_at: "2025-01-01T00:00:00Z",
            original_filename: "test.pdf",
            duplicate_status: null,
        } as Invoice,
        {
            id: "inv-2",
            invoice_number: "INV-002",
            vendor_name: "Another Vendor",
            invoice_date: "2025-01-02",
            total_amount: 200.0,
            status: "approved",
            source: "web_upload",
            uploaded_at: "2025-01-02T00:00:00Z",
            original_filename: "test2.pdf",
            duplicate_status: "suspected",
        } as Invoice,
    ];

    it("renders invoice table with data", () => {
        render(<InvoicesTable invoices={mockInvoices} />);

        // Check if invoice numbers are rendered
        expect(screen.getByText("INV-001")).toBeInTheDocument();
        expect(screen.getByText("INV-002")).toBeInTheDocument();

        // Check if vendor names are rendered
        expect(screen.getByText("Test Vendor")).toBeInTheDocument();
        expect(screen.getByText("Another Vendor")).toBeInTheDocument();
    });

    it("renders sortable column headers", () => {
        render(<InvoicesTable invoices={mockInvoices} />);

        // Check if sortable headers are present
        expect(screen.getByRole("button", { name: /Invoice #/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Vendor/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Date/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Amount/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Status/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Created/i })).toBeInTheDocument();
    });

    it("renders empty state when no invoices", () => {
        render(<InvoicesTable invoices={[]} />);

        expect(screen.getByText("No results.")).toBeInTheDocument();
    });
});
