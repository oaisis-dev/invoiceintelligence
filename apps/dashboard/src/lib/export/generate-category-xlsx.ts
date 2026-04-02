import ExcelJS from "exceljs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CategoryExportInvoice {
  id: string;
  vendor_name: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
}

export interface CategoryExportLineItem {
  invoice_id: string;
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

export interface CategoryExportFilters {
  status?: string;
  search?: string;
  source?: string;
  duplicateStatus?: string;
  dateFrom?: string;
  dateTo?: string;
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
const CATEGORY_FILL: ExcelJS.FillPattern = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFF8E1" },
};
const THIN_BORDER: Partial<ExcelJS.Borders> = {
  bottom: { style: "thin", color: { argb: "D1D5DB" } },
};
const SUBTOTAL_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "9CA3AF" } },
};
const GRAND_TOTAL_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "double", color: { argb: "374151" } },
};

const COLUMNS = [
  "Invoice #",
  "Vendor",
  "Date",
  "Item Code",
  "Description",
  "Qty",
  "Size",
  "Unit",
  "Unit Price",
  "Ext Price",
  "Tax",
  "Account",
  "Sub Acct",
];

/** Indices (1-based) of right-aligned columns. */
const NUMERIC_COLS = [6, 9, 10, 11, 12, 13]; // Qty, UnitPrice, ExtPrice, Tax, Account, SubAcct

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a "YYYY-MM-DD" date string to a JS Date for ExcelJS.
 * Uses local date constructor to avoid timezone off-by-one issues.
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

function buildFilterSummary(filters: CategoryExportFilters): string {
  const parts: string[] = [];

  if (filters.dateFrom || filters.dateTo) {
    const from = filters.dateFrom ?? "...";
    const to = filters.dateTo ?? "...";
    parts.push(`Date Range: ${from} \u2013 ${to}`);
  }

  if (filters.status) {
    parts.push(`Status: ${filters.status}`);
  } else {
    parts.push("Status: All");
  }

  if (filters.source) {
    parts.push(`Source: ${filters.source}`);
  }

  if (filters.search) {
    parts.push(`Search: "${filters.search}"`);
  }

  if (filters.duplicateStatus) {
    parts.push(`Duplicate: ${filters.duplicateStatus}`);
  }

  return parts.join(" | ");
}

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------

export async function generateCategoryXlsx(
  invoices: CategoryExportInvoice[],
  lineItems: CategoryExportLineItem[],
  filters: CategoryExportFilters,
  generatedAt: string,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Items by Category");

  // Build invoice lookup
  const invoiceMap = new Map<string, CategoryExportInvoice>();
  for (const inv of invoices) {
    invoiceMap.set(inv.id, inv);
  }

  // Group line items by category
  const UNCATEGORIZED = "Uncategorized";
  const grouped = new Map<string, CategoryExportLineItem[]>();
  for (const item of lineItems) {
    const cat = item.category?.trim() || UNCATEGORIZED;
    const existing = grouped.get(cat);
    if (existing) {
      existing.push(item);
    } else {
      grouped.set(cat, [item]);
    }
  }

  // Sort categories alphabetically, "Uncategorized" last
  const sortedCategories = [...grouped.keys()].sort((a, b) => {
    if (a === UNCATEGORIZED) return 1;
    if (b === UNCATEGORIZED) return -1;
    return a.localeCompare(b);
  });

  // Sort items within each category by vendor then date
  for (const cat of sortedCategories) {
    const items = grouped.get(cat)!;
    items.sort((a, b) => {
      const invA = invoiceMap.get(a.invoice_id);
      const invB = invoiceMap.get(b.invoice_id);
      const vendorCmp = (invA?.vendor_name ?? "").localeCompare(
        invB?.vendor_name ?? "",
      );
      if (vendorCmp !== 0) return vendorCmp;
      return (invA?.invoice_date ?? "").localeCompare(
        invB?.invoice_date ?? "",
      );
    });
  }

  // --- Title row (row 1) ---
  const titleRow = sheet.addRow(["Invoice Items"]);
  titleRow.getCell(1).font = { bold: true, size: 16 };

  // --- Subtitle row (row 2) ---
  const subtitle = `${buildFilterSummary(filters)} | Generated: ${generatedAt}`;
  const subtitleRow = sheet.addRow([subtitle]);
  subtitleRow.getCell(1).font = { size: 10, color: { argb: "6B7280" } };

  // --- Empty separator (row 3) ---
  sheet.addRow([]);

  // Freeze title/subtitle/separator so they stay visible while scrolling
  sheet.views = [{ state: "frozen" as const, ySplit: 3, xSplit: 0 }];

  // --- Category groups ---
  let grandTotal = 0;
  let grandTax = 0;

  for (const category of sortedCategories) {
    const items = grouped.get(category)!;
    const itemCount = items.length;

    // Category header row (spans full width)
    const catRow = sheet.addRow([`${category} (${itemCount} items)`]);
    catRow.getCell(1).font = { bold: true, size: 11 };
    catRow.getCell(1).fill = CATEGORY_FILL;
    // Apply fill across all columns
    for (let ci = 2; ci <= COLUMNS.length; ci++) {
      catRow.getCell(ci).fill = CATEGORY_FILL;
    }

    // Column headers
    const headerRow = sheet.addRow(COLUMNS);
    headerRow.eachCell((cell) => {
      cell.font = BOLD;
      cell.fill = HEADER_FILL;
      cell.border = THIN_BORDER;
    });
    for (const colIdx of NUMERIC_COLS) {
      headerRow.getCell(colIdx).alignment = RIGHT_ALIGN;
    }

    // Data rows
    let categoryTotal = 0;
    let categoryTax = 0;
    for (const item of items) {
      const inv = invoiceMap.get(item.invoice_id);
      const dateValue = parseDate(inv?.invoice_date ?? null);
      const row = sheet.addRow([
        inv?.invoice_number ?? "",
        inv?.vendor_name ?? "",
        dateValue ?? "",
        item.item_code ?? "",
        item.description ?? "",
        item.quantity,
        item.size ?? "",
        item.unit ?? "",
        item.unit_price,
        item.extended_price,
        item.tax_amount,
        item.account,
        item.sub_account,
      ]);

      // Date format
      if (dateValue) row.getCell(3).numFmt = DATE_FORMAT;

      // Number formats
      row.getCell(6).numFmt = QTY_FORMAT;       // Qty
      row.getCell(9).numFmt = CURRENCY_FORMAT;  // Unit Price
      row.getCell(10).numFmt = CURRENCY_FORMAT; // Ext Price
      row.getCell(11).numFmt = CURRENCY_FORMAT; // Tax

      // Right-align numeric columns
      for (const colIdx of NUMERIC_COLS) {
        row.getCell(colIdx).alignment = RIGHT_ALIGN;
      }

      if (item.extended_price != null) {
        categoryTotal += item.extended_price;
      }
      if (item.tax_amount != null) {
        categoryTax += item.tax_amount;
      }
    }

    // Subtotal row (13 columns)
    const subtotalRow = sheet.addRow([
      "", "", "", "", "", "", "", "",
      "Subtotal",
      Math.round(categoryTotal * 100) / 100,
      Math.round(categoryTax * 100) / 100,
      "", "",
    ]);
    subtotalRow.getCell(9).font = BOLD;
    subtotalRow.getCell(9).alignment = RIGHT_ALIGN;
    subtotalRow.getCell(10).font = BOLD;
    subtotalRow.getCell(10).numFmt = CURRENCY_FORMAT;
    subtotalRow.getCell(10).alignment = RIGHT_ALIGN;
    subtotalRow.getCell(11).font = BOLD;
    subtotalRow.getCell(11).numFmt = CURRENCY_FORMAT;
    subtotalRow.getCell(11).alignment = RIGHT_ALIGN;
    subtotalRow.getCell(9).border = SUBTOTAL_BORDER;
    subtotalRow.getCell(10).border = SUBTOTAL_BORDER;
    subtotalRow.getCell(11).border = SUBTOTAL_BORDER;

    grandTotal += categoryTotal;
    grandTax += categoryTax;

    // Empty separator between categories
    sheet.addRow([]);
  }

  // --- Grand total row ---
  const grandTotalRounded = Math.round(grandTotal * 100) / 100;
  const grandTaxRounded = Math.round(grandTax * 100) / 100;
  const grandRow = sheet.addRow([
    "", "", "", "", "", "", "", "",
    "GRAND TOTAL",
    grandTotalRounded,
    grandTaxRounded,
    "", "",
  ]);
  grandRow.getCell(9).font = { bold: true, size: 12 };
  grandRow.getCell(9).alignment = RIGHT_ALIGN;
  grandRow.getCell(10).font = { bold: true, size: 12 };
  grandRow.getCell(10).numFmt = CURRENCY_FORMAT;
  grandRow.getCell(10).alignment = RIGHT_ALIGN;
  grandRow.getCell(11).font = { bold: true, size: 12 };
  grandRow.getCell(11).numFmt = CURRENCY_FORMAT;
  grandRow.getCell(11).alignment = RIGHT_ALIGN;
  grandRow.getCell(9).border = GRAND_TOTAL_BORDER;
  grandRow.getCell(10).border = GRAND_TOTAL_BORDER;
  grandRow.getCell(11).border = GRAND_TOTAL_BORDER;

  // --- Auto-width columns ---
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

  // =========================================================================
  // "Category Metadata" sheet — unique items per category with counts
  // =========================================================================

  const metaSheet = workbook.addWorksheet("Category Metadata");

  // Title row
  const metaTitleRow = metaSheet.addRow(["Category Metadata"]);
  metaTitleRow.getCell(1).font = { bold: true, size: 16 };

  // Subtitle row (reuses same filter summary)
  const metaSubtitleRow = metaSheet.addRow([subtitle]);
  metaSubtitleRow.getCell(1).font = { size: 10, color: { argb: "6B7280" } };

  // Empty separator
  metaSheet.addRow([]);

  // Freeze title/subtitle/separator
  metaSheet.views = [{ state: "frozen" as const, ySplit: 3, xSplit: 0 }];

  // Column headers
  const META_COLUMNS = ["Category", "Item Code", "Description", "Occurrences"];
  const metaHeaderRow = metaSheet.addRow(META_COLUMNS);
  metaHeaderRow.eachCell((cell) => {
    cell.font = BOLD;
    cell.fill = HEADER_FILL;
    cell.border = THIN_BORDER;
  });
  metaHeaderRow.getCell(4).alignment = RIGHT_ALIGN;

  // Data rows — deduplicated items per category
  for (const category of sortedCategories) {
    const items = grouped.get(category)!;

    // Aggregate unique items by (item_code, description)
    const uniqueItems = new Map<
      string,
      { itemCode: string; description: string; count: number }
    >();
    for (const item of items) {
      const code = item.item_code ?? "";
      const desc = item.description ?? "";
      const key = `${code}\0${desc}`;
      const existing = uniqueItems.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        uniqueItems.set(key, { itemCode: code, description: desc, count: 1 });
      }
    }

    // Sort by item_code then description
    const sortedItems = [...uniqueItems.values()].sort((a, b) => {
      const codeCmp = a.itemCode.localeCompare(b.itemCode);
      if (codeCmp !== 0) return codeCmp;
      return a.description.localeCompare(b.description);
    });

    for (const entry of sortedItems) {
      const row = metaSheet.addRow([
        category,
        entry.itemCode,
        entry.description,
        entry.count,
      ]);
      row.getCell(4).alignment = RIGHT_ALIGN;
    }
  }

  // Auto-width for metadata columns
  metaSheet.columns.forEach((col) => {
    let maxLen = 10;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const len = String(cell.value ?? "").length;
      if (len > maxLen) maxLen = len;
    });
    col.width = Math.min(maxLen + 2, 40);
  });

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
