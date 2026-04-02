import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import { generateInvoiceXlsx } from "./generate-xlsx";
import type { ExportCharges } from "./generate-xlsx";

async function loadWorkbook(buffer: Buffer): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  return wb;
}

function getSheet(wb: ExcelJS.Workbook) {
  return wb.getWorksheet("Invoice")!;
}

const sampleInvoice = {
  vendor_name: "Acme Corp",
  invoice_number: "INV-001",
  invoice_date: "2026-01-15",
  total_amount: 1234.56,
};

const sampleLineItems = [
  {
    sort_order: 1,
    item_code: "ABC",
    description: "Widget",
    quantity: 10,
    size: "Large",
    unit: "EA",
    unit_price: 100.0,
    extended_price: 1000.0,
    tax_amount: 80.0,
    category: "Supplies",
    account: 5000,
    sub_account: 10,
  },
  {
    sort_order: 2,
    item_code: null,
    description: "Service",
    quantity: 1,
    size: null,
    unit: null,
    unit_price: 234.56,
    extended_price: 234.56,
    tax_amount: null,
    category: null,
    account: null,
    sub_account: null,
  },
];

const noCharges: ExportCharges = { tax: 0, freight: 0, shipping: 0, discount: 0 };

async function generate(
  invoice = sampleInvoice,
  items = sampleLineItems,
  charges?: ExportCharges,
) {
  const buffer = await generateInvoiceXlsx(
    invoice,
    items,
    "download",
    "2026-01-20T00:00:00Z",
    charges,
  );
  return getSheet(await loadWorkbook(buffer));
}

describe("generateInvoiceXlsx", () => {
  // ---- Header section ----

  it("writes invoice_date as a Date object with date format", async () => {
    const sheet = await generate();
    const dateCell = sheet.getRow(3).getCell(2);
    expect(dateCell.value).toBeInstanceOf(Date);
    expect(dateCell.numFmt).toBe("YYYY-MM-DD");
  });

  it("handles null invoice_date without errors", async () => {
    const sheet = await generate({ ...sampleInvoice, invoice_date: null });
    const dateCell = sheet.getRow(3).getCell(2);
    expect(dateCell.value).toBe("");
  });

  it("does not include Total Amount in header section", async () => {
    const sheet = await generate();
    // Rows 1-5 are header; row 4 should be Exported At, not Total Amount
    expect(sheet.getRow(4).getCell(1).value).toBe("Exported At");
    expect(sheet.getRow(5).getCell(1).value).toBe("Destination");
  });

  // ---- Column headers ----

  it("includes Tax column header at position 9", async () => {
    const sheet = await generate();
    const headerRow = sheet.getRow(7);
    expect(headerRow.getCell(9).value).toBe("Tax");
  });

  it("has 12 column headers", async () => {
    const sheet = await generate();
    const headerRow = sheet.getRow(7);
    expect(headerRow.getCell(12).value).toBe("Sub Account");
  });

  // ---- Data rows ----

  it("writes tax_amount values in data rows", async () => {
    const sheet = await generate();
    const dataRow = sheet.getRow(8); // first data row
    expect(dataRow.getCell(9).value).toBe(80.0);
    expect(dataRow.getCell(9).numFmt).toBe("$#,##0.00");
  });

  it("handles null tax_amount in data rows", async () => {
    const sheet = await generate();
    const dataRow = sheet.getRow(9); // second item — tax_amount is null
    expect(dataRow.getCell(9).value).toBeNull();
  });

  // ---- Number formats ----

  it("applies quantity format #,##0", async () => {
    const sheet = await generate();
    expect(sheet.getRow(8).getCell(4).numFmt).toBe("#,##0");
  });

  it("applies currency format to Unit Price and Extended Price", async () => {
    const sheet = await generate();
    const row = sheet.getRow(8);
    expect(row.getCell(7).numFmt).toBe("$#,##0.00");
    expect(row.getCell(8).numFmt).toBe("$#,##0.00");
  });

  // ---- Alignment ----

  it("right-aligns numeric columns in data rows", async () => {
    const sheet = await generate();
    const row = sheet.getRow(8);
    for (const col of [1, 4, 7, 8, 9, 11, 12]) {
      expect(row.getCell(col).alignment?.horizontal).toBe("right");
    }
  });

  it("right-aligns numeric column headers", async () => {
    const sheet = await generate();
    const headerRow = sheet.getRow(7);
    expect(headerRow.getCell(7).alignment?.horizontal).toBe("right");
    expect(headerRow.getCell(8).alignment?.horizontal).toBe("right");
    expect(headerRow.getCell(9).alignment?.horizontal).toBe("right");
  });

  // ---- Freeze panes ----

  it("freezes the column header row (ySplit: 7)", async () => {
    const sheet = await generate();
    const view = sheet.views[0];
    expect(view).toBeDefined();
    expect(view?.state).toBe("frozen");
    expect(view?.ySplit).toBe(7);
  });

  // ---- Summary section ----

  it("renders Subtotal, Tax, and Total summary rows", async () => {
    const sheet = await generate(sampleInvoice, sampleLineItems, noCharges);
    // After 2 data rows (rows 8-9) + 1 separator (row 10), summary starts at row 11
    expect(sheet.getRow(11).getCell(7).value).toBe("Subtotal");
    expect(sheet.getRow(11).getCell(8).value).toBe(1234.56); // 1000 + 234.56
    expect(sheet.getRow(12).getCell(7).value).toBe("Tax");
    expect(sheet.getRow(12).getCell(8).value).toBe(80.0); // line-level tax
    expect(sheet.getRow(13).getCell(7).value).toBe("Total");
    expect(sheet.getRow(13).getCell(8).numFmt).toBe("$#,##0.00");
  });

  it("shows freight and shipping rows only when > 0", async () => {
    const charges: ExportCharges = { tax: 0, freight: 15.0, shipping: 5.0, discount: 0 };
    const sheet = await generate(sampleInvoice, sampleLineItems, charges);

    // Collect all summary labels
    const labels: (ExcelJS.CellValue)[] = [];
    for (let r = 11; r <= 20; r++) {
      const val = sheet.getRow(r).getCell(7).value;
      if (val) labels.push(val);
    }
    expect(labels).toContain("Freight");
    expect(labels).toContain("Shipping");
    expect(labels).not.toContain("Discount");
  });

  it("does not show freight/shipping/discount rows when charges are zero", async () => {
    const sheet = await generate(sampleInvoice, sampleLineItems, noCharges);

    const labels: (ExcelJS.CellValue)[] = [];
    for (let r = 11; r <= 20; r++) {
      const val = sheet.getRow(r).getCell(7).value;
      if (val) labels.push(val);
    }
    expect(labels).not.toContain("Freight");
    expect(labels).not.toContain("Shipping");
    expect(labels).not.toContain("Discount");
  });

  it("shows discount as negative value", async () => {
    const charges: ExportCharges = { tax: 0, freight: 0, shipping: 0, discount: 10.0 };
    const sheet = await generate(sampleInvoice, sampleLineItems, charges);

    for (let r = 11; r <= 20; r++) {
      if (sheet.getRow(r).getCell(7).value === "Discount") {
        expect(sheet.getRow(r).getCell(8).value).toBe(-10.0);
        break;
      }
    }
  });

  it("uses invoice-level tax when no line items have tax_amount", async () => {
    const noTaxItems = sampleLineItems.map((item) => ({ ...item, tax_amount: null }));
    const charges: ExportCharges = { tax: 50.0, freight: 0, shipping: 0, discount: 0 };
    const sheet = await generate(sampleInvoice, noTaxItems, charges);

    expect(sheet.getRow(12).getCell(7).value).toBe("Tax");
    expect(sheet.getRow(12).getCell(8).value).toBe(50.0);
  });

  it("shows stated Invoice Total when it differs from computed", async () => {
    // total_amount = 1234.56 but computed will be different
    const invoice = { ...sampleInvoice, total_amount: 9999.99 };
    const sheet = await generate(invoice, sampleLineItems, noCharges);

    const labels: (ExcelJS.CellValue)[] = [];
    for (let r = 11; r <= 20; r++) {
      const val = sheet.getRow(r).getCell(7).value;
      if (val) labels.push(val);
    }
    expect(labels).toContain("Invoice Total (Stated)");
  });

  it("does not show stated Invoice Total when it matches computed", async () => {
    // Computed: 1000 + 234.56 + 80 = 1314.56
    const invoice = { ...sampleInvoice, total_amount: 1314.56 };
    const sheet = await generate(invoice, sampleLineItems, noCharges);

    const labels: (ExcelJS.CellValue)[] = [];
    for (let r = 11; r <= 20; r++) {
      const val = sheet.getRow(r).getCell(7).value;
      if (val) labels.push(val);
    }
    expect(labels).not.toContain("Invoice Total (Stated)");
  });

  // ---- Edge cases ----

  it("works with empty line items array", async () => {
    const sheet = await generate(sampleInvoice, []);
    // Should still have header row and summary section
    expect(sheet.getRow(7).getCell(1).value).toBe("#");
    // Summary: row 8 = separator, row 9 = Subtotal
    expect(sheet.getRow(9).getCell(7).value).toBe("Subtotal");
    expect(sheet.getRow(9).getCell(8).value).toBe(0);
  });
});
