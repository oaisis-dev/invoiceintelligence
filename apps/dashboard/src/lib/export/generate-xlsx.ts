import ExcelJS from "exceljs";

interface InvoiceData {
  vendor_name: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  total_amount: number | null;
}

interface LineItemData {
  sort_order: number;
  item_code: string | null;
  description: string | null;
  quantity: number | null;
  size: string | null;
  unit: string | null;
  unit_price: number | null;
  extended_price: number | null;
  tax_amount: number | null;
  category: string | null;
  account: number | null;
  sub_account: number | null;
}

export interface ExportCharges {
  tax: number;
  freight: number;
  shipping: number;
  discount: number;
}

// ---------------------------------------------------------------------------
// Style constants
// ---------------------------------------------------------------------------

const CURRENCY_FORMAT = "$#,##0.00";
const DATE_FORMAT = "YYYY-MM-DD";
const QTY_FORMAT = "#,##0";
const BOLD: Partial<ExcelJS.Font> = { bold: true };
const RIGHT_ALIGN: Partial<ExcelJS.Alignment> = { horizontal: "right" };
const HEADER_FILL: ExcelJS.FillPattern = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "F3F4F6" },
};
const THIN_BORDER: Partial<ExcelJS.Borders> = {
  bottom: { style: "thin", color: { argb: "D1D5DB" } },
};
const TOTAL_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "double", color: { argb: "374151" } },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a "YYYY-MM-DD" date string to a JS Date for ExcelJS.
 * Uses local date constructor to avoid timezone off-by-one issues.
 * Returns null if the input is null/empty/unparseable.
 */
function parseDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split("-");
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0]!, 10);
  const month = parseInt(parts[1]!, 10) - 1;
  const day = parseInt(parts[2]!, 10);
  const d = new Date(year, month, day);
  if (isNaN(d.getTime())) return null;
  return d;
}

/** Indices (1-based) of right-aligned columns in the line items table. */
const NUMERIC_COLS = [1, 4, 7, 8, 9, 11, 12]; // #, Qty, UnitPrice, ExtPrice, Tax, Account, SubAcct

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------

export async function generateInvoiceXlsx(
  invoice: InvoiceData,
  lineItems: LineItemData[],
  destination: string,
  exportedAt: string,
  charges?: ExportCharges,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Invoice");

  // --- Header section (rows 1-5) ---
  // Row 1: Vendor
  const vendorRow = sheet.addRow(["Vendor", invoice.vendor_name ?? ""]);
  vendorRow.getCell(1).font = BOLD;

  // Row 2: Invoice #
  const invNumRow = sheet.addRow(["Invoice #", invoice.invoice_number ?? ""]);
  invNumRow.getCell(1).font = BOLD;

  // Row 3: Invoice Date (as Excel date)
  const invoiceDate = parseDate(invoice.invoice_date);
  const invDateRow = sheet.addRow(["Invoice Date", invoiceDate ?? ""]);
  invDateRow.getCell(1).font = BOLD;
  if (invoiceDate) {
    invDateRow.getCell(2).numFmt = DATE_FORMAT;
  }

  // Row 4: Exported At
  const exportedRow = sheet.addRow(["Exported At", exportedAt]);
  exportedRow.getCell(1).font = BOLD;

  // Row 5: Destination
  const destRow = sheet.addRow(["Destination", destination]);
  destRow.getCell(1).font = BOLD;

  // Row 6: empty separator
  sheet.addRow([]);

  // --- Line items table ---
  const columns = [
    "#", "Item Code", "Description", "Qty", "Size", "Unit",
    "Unit Price", "Extended Price", "Tax", "Category", "Account", "Sub Account",
  ];

  const headerRow = sheet.addRow(columns); // Row 7
  headerRow.eachCell((cell) => {
    cell.font = BOLD;
    cell.fill = HEADER_FILL;
    cell.border = THIN_BORDER;
  });
  for (const colIdx of NUMERIC_COLS) {
    headerRow.getCell(colIdx).alignment = RIGHT_ALIGN;
  }

  // Freeze panes so column header row stays visible
  sheet.views = [{ state: "frozen" as const, ySplit: 7, xSplit: 0 }];

  for (const item of lineItems) {
    const row = sheet.addRow([
      item.sort_order,
      item.item_code ?? "",
      item.description ?? "",
      item.quantity,
      item.size ?? "",
      item.unit ?? "",
      item.unit_price,
      item.extended_price,
      item.tax_amount,
      item.category ?? "",
      item.account,
      item.sub_account,
    ]);

    // Number formats
    row.getCell(4).numFmt = QTY_FORMAT;       // Qty
    row.getCell(7).numFmt = CURRENCY_FORMAT;  // Unit Price
    row.getCell(8).numFmt = CURRENCY_FORMAT;  // Extended Price
    row.getCell(9).numFmt = CURRENCY_FORMAT;  // Tax

    // Right-align numeric columns
    for (const colIdx of NUMERIC_COLS) {
      row.getCell(colIdx).alignment = RIGHT_ALIGN;
    }
  }

  // --- Summary section ---
  const c = charges ?? { tax: 0, freight: 0, shipping: 0, discount: 0 };

  const lineSubtotal = lineItems.reduce(
    (s, item) => s + (item.extended_price ?? 0),
    0,
  );
  const hasLineTax = lineItems.some((item) => item.tax_amount != null);
  const lineTax = lineItems.reduce(
    (s, item) => s + (item.tax_amount ?? 0),
    0,
  );
  const tax = hasLineTax ? lineTax : c.tax;

  const computedTotal =
    Math.round(
      (lineSubtotal + tax + c.freight + c.shipping - c.discount) * 100,
    ) / 100;

  // Separator
  sheet.addRow([]);

  // Helper: add a summary row with label in col 7 and value in col 8
  const addSummaryRow = (
    label: string,
    value: number,
    bold = false,
    border?: Partial<ExcelJS.Borders>,
  ) => {
    const row = sheet.addRow(["", "", "", "", "", "", label, value, "", "", "", ""]);
    row.getCell(7).font = bold ? { bold: true, size: 11 } : BOLD;
    row.getCell(7).alignment = RIGHT_ALIGN;
    row.getCell(8).numFmt = CURRENCY_FORMAT;
    row.getCell(8).alignment = RIGHT_ALIGN;
    if (bold) row.getCell(8).font = { bold: true, size: 11 };
    if (border) {
      row.getCell(7).border = border;
      row.getCell(8).border = border;
    }
    return row;
  };

  addSummaryRow("Subtotal", Math.round(lineSubtotal * 100) / 100);
  addSummaryRow("Tax", Math.round(tax * 100) / 100);
  if (c.freight > 0) addSummaryRow("Freight", c.freight);
  if (c.shipping > 0) addSummaryRow("Shipping", c.shipping);
  if (c.discount > 0) addSummaryRow("Discount", -c.discount);
  addSummaryRow("Total", computedTotal, true, TOTAL_BORDER);

  // If stated invoice total differs from computed, show it for reference
  if (
    invoice.total_amount != null &&
    Math.abs(invoice.total_amount - computedTotal) > 0.01
  ) {
    addSummaryRow("Invoice Total (Stated)", invoice.total_amount);
  }

  // --- Auto-width columns based on content ---
  sheet.columns.forEach((col) => {
    let maxLen = 10;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      // Date objects stringify to very long locale strings; use format length instead
      const len = cell.value instanceof Date
        ? (cell.numFmt ?? DATE_FORMAT).length
        : String(cell.value ?? "").length;
      if (len > maxLen) maxLen = len;
    });
    col.width = Math.min(maxLen + 2, 40);
  });

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
