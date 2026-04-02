import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import { generateCategoryXlsx } from "./generate-category-xlsx";
import type {
  CategoryExportInvoice,
  CategoryExportLineItem,
} from "./generate-category-xlsx";

async function loadWorkbook(buffer: Buffer): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  return wb;
}

function getSheet(wb: ExcelJS.Workbook) {
  return wb.getWorksheet("Items by Category")!;
}

const invoices: CategoryExportInvoice[] = [
  { id: "inv-1", vendor_name: "Vendor A", invoice_number: "V-001", invoice_date: "2026-02-01" },
  { id: "inv-2", vendor_name: "Vendor B", invoice_number: "V-002", invoice_date: "2026-02-10" },
];

const lineItems: CategoryExportLineItem[] = [
  {
    invoice_id: "inv-1",
    item_code: "X1",
    description: "Product A",
    quantity: 5,
    size: null,
    unit: "EA",
    unit_price: 10.0,
    extended_price: 50.0,
    tax_amount: 4.25,
    category: "Food",
    account: 5000,
    sub_account: null,
  },
  {
    invoice_id: "inv-2",
    item_code: "Y1",
    description: "Product B",
    quantity: 2,
    size: "Medium",
    unit: "CS",
    unit_price: 25.0,
    extended_price: 50.0,
    tax_amount: 3.75,
    category: "Food",
    account: 5000,
    sub_account: 10,
  },
  {
    invoice_id: "inv-1",
    item_code: null,
    description: "Cleaning Supply",
    quantity: 1,
    size: null,
    unit: null,
    unit_price: 15.0,
    extended_price: 15.0,
    tax_amount: null,
    category: "Supplies",
    account: 6000,
    sub_account: null,
  },
];

const filters = {};
const generatedAt = "2026-02-15";

async function generate(
  inv = invoices,
  items = lineItems,
  f = filters,
  at = generatedAt,
) {
  const buffer = await generateCategoryXlsx(inv, items, f, at);
  return getSheet(await loadWorkbook(buffer));
}

describe("generateCategoryXlsx", () => {
  // ---- Structure ----

  it("has title, subtitle, and separator in first 3 rows", async () => {
    const sheet = await generate();
    expect(sheet.getRow(1).getCell(1).value).toBe("Invoice Items");
    expect(String(sheet.getRow(2).getCell(1).value)).toContain("Generated:");
  });

  // ---- Freeze panes ----

  it("freezes the top 3 rows (ySplit: 3)", async () => {
    const sheet = await generate();
    const view = sheet.views[0];
    expect(view?.state).toBe("frozen");
    expect(view?.ySplit).toBe(3);
  });

  // ---- Tax column ----

  it("includes Tax column header at position 11", async () => {
    const sheet = await generate();
    // Row 4 = first category header ("Food"), row 5 = column headers
    const headerRow = sheet.getRow(5);
    expect(headerRow.getCell(11).value).toBe("Tax");
  });

  it("has 13 column headers", async () => {
    const sheet = await generate();
    const headerRow = sheet.getRow(5);
    expect(headerRow.getCell(13).value).toBe("Sub Acct");
  });

  it("writes tax_amount values in data rows", async () => {
    const sheet = await generate();
    // Row 6 = first data row in "Food" category
    const dataRow = sheet.getRow(6);
    expect(dataRow.getCell(11).value).toBe(4.25);
    expect(dataRow.getCell(11).numFmt).toBe("$#,##0.00");
  });

  // ---- Dates ----

  it("writes invoice_date as a Date object", async () => {
    const sheet = await generate();
    const dataRow = sheet.getRow(6);
    expect(dataRow.getCell(3).value).toBeInstanceOf(Date);
    expect(dataRow.getCell(3).numFmt).toBe("YYYY-MM-DD");
  });

  // ---- Number formats ----

  it("applies quantity format #,##0", async () => {
    const sheet = await generate();
    expect(sheet.getRow(6).getCell(6).numFmt).toBe("#,##0");
  });

  it("applies currency format to Unit Price, Ext Price, Tax", async () => {
    const sheet = await generate();
    const row = sheet.getRow(6);
    expect(row.getCell(9).numFmt).toBe("$#,##0.00");
    expect(row.getCell(10).numFmt).toBe("$#,##0.00");
    expect(row.getCell(11).numFmt).toBe("$#,##0.00");
  });

  // ---- Alignment ----

  it("right-aligns numeric columns in data rows", async () => {
    const sheet = await generate();
    const row = sheet.getRow(6);
    for (const col of [6, 9, 10, 11, 12, 13]) {
      expect(row.getCell(col).alignment?.horizontal).toBe("right");
    }
  });

  it("right-aligns numeric column headers", async () => {
    const sheet = await generate();
    const headerRow = sheet.getRow(5);
    for (const col of [6, 9, 10, 11, 12, 13]) {
      expect(headerRow.getCell(col).alignment?.horizontal).toBe("right");
    }
  });

  // ---- Subtotals ----

  it("includes tax in category subtotal rows", async () => {
    const sheet = await generate();
    // Food category: 2 items (rows 6-7), subtotal at row 8
    const subtotalRow = sheet.getRow(8);
    expect(subtotalRow.getCell(9).value).toBe("Subtotal");
    expect(subtotalRow.getCell(10).value).toBe(100.0); // 50 + 50
    expect(subtotalRow.getCell(11).value).toBe(8.0);   // 4.25 + 3.75
    expect(subtotalRow.getCell(11).numFmt).toBe("$#,##0.00");
  });

  // ---- Grand total ----

  it("includes tax in grand total row", async () => {
    const sheet = await generate();
    // Find the GRAND TOTAL row
    let grandRow: ExcelJS.Row | null = null;
    sheet.eachRow((row) => {
      if (row.getCell(9).value === "GRAND TOTAL") {
        grandRow = row;
      }
    });
    expect(grandRow).not.toBeNull();
    expect(grandRow!.getCell(10).value).toBe(115.0); // 50 + 50 + 15
    expect(grandRow!.getCell(11).value).toBe(8.0);   // 4.25 + 3.75 + 0
    expect(grandRow!.getCell(10).numFmt).toBe("$#,##0.00");
    expect(grandRow!.getCell(11).numFmt).toBe("$#,##0.00");
  });

  // ---- Sorting ----

  it("sorts categories alphabetically with Uncategorized last", async () => {
    const itemsWithUncat: CategoryExportLineItem[] = [
      ...lineItems,
      {
        invoice_id: "inv-1",
        item_code: null,
        description: "Misc",
        quantity: 1,
        size: null,
        unit: null,
        unit_price: 5.0,
        extended_price: 5.0,
        tax_amount: null,
        category: null, // will become Uncategorized
        account: null,
        sub_account: null,
      },
    ];
    const sheet = await generate(invoices, itemsWithUncat);

    // Collect category header labels
    const categoryHeaders: string[] = [];
    sheet.eachRow((row) => {
      const val = String(row.getCell(1).value ?? "");
      if (val.includes(" items)")) {
        categoryHeaders.push(val);
      }
    });

    expect(categoryHeaders.length).toBe(3);
    expect(categoryHeaders[0]).toContain("Food");
    expect(categoryHeaders[1]).toContain("Supplies");
    expect(categoryHeaders[2]).toContain("Uncategorized");
  });

  // ---- Edge cases ----

  it("handles null tax_amount in data rows", async () => {
    const sheet = await generate();
    // Supplies category: find its data row (the one with "Cleaning Supply")
    let supplyRow: ExcelJS.Row | null = null;
    sheet.eachRow((row) => {
      if (row.getCell(5).value === "Cleaning Supply") {
        supplyRow = row;
      }
    });
    expect(supplyRow).not.toBeNull();
    expect(supplyRow!.getCell(11).value).toBeNull();
  });

  it("works with empty line items", async () => {
    const sheet = await generate(invoices, []);
    // Should have title and grand total with zeros
    expect(sheet.getRow(1).getCell(1).value).toBe("Invoice Items");
    let grandRow: ExcelJS.Row | null = null;
    sheet.eachRow((row) => {
      if (row.getCell(9).value === "GRAND TOTAL") {
        grandRow = row;
      }
    });
    expect(grandRow).not.toBeNull();
    expect(grandRow!.getCell(10).value).toBe(0);
    expect(grandRow!.getCell(11).value).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Category Metadata sheet
// ---------------------------------------------------------------------------

function getMetaSheet(wb: ExcelJS.Workbook) {
  return wb.getWorksheet("Category Metadata")!;
}

async function generateMeta(
  inv = invoices,
  items = lineItems,
  f = filters,
  at = generatedAt,
) {
  const buffer = await generateCategoryXlsx(inv, items, f, at);
  return getMetaSheet(await loadWorkbook(buffer));
}

describe("Category Metadata sheet", () => {
  // ---- Structure ----

  it("exists in the workbook", async () => {
    const buffer = await generateCategoryXlsx(invoices, lineItems, filters, generatedAt);
    const wb = await loadWorkbook(buffer);
    expect(wb.getWorksheet("Category Metadata")).toBeDefined();
  });

  it("has title, subtitle, and separator in first 3 rows", async () => {
    const sheet = await generateMeta();
    expect(sheet.getRow(1).getCell(1).value).toBe("Category Metadata");
    expect(String(sheet.getRow(2).getCell(1).value)).toContain("Generated:");
  });

  it("freezes the top 3 rows", async () => {
    const sheet = await generateMeta();
    const view = sheet.views[0];
    expect(view?.state).toBe("frozen");
    expect(view?.ySplit).toBe(3);
  });

  // ---- Column headers ----

  it("has 4 column headers in row 4", async () => {
    const sheet = await generateMeta();
    const headerRow = sheet.getRow(4);
    expect(headerRow.getCell(1).value).toBe("Category");
    expect(headerRow.getCell(2).value).toBe("Item Code");
    expect(headerRow.getCell(3).value).toBe("Description");
    expect(headerRow.getCell(4).value).toBe("Occurrences");
  });

  it("applies header fill and bold to column headers", async () => {
    const sheet = await generateMeta();
    const headerRow = sheet.getRow(4);
    expect(headerRow.getCell(1).font?.bold).toBe(true);
    const fill = headerRow.getCell(1).fill as ExcelJS.FillPattern;
    expect(fill.fgColor?.argb).toBe("F3F4F6");
  });

  it("right-aligns the Occurrences header", async () => {
    const sheet = await generateMeta();
    expect(sheet.getRow(4).getCell(4).alignment?.horizontal).toBe("right");
  });

  // ---- Data content ----

  it("lists unique items per category with occurrence counts", async () => {
    const sheet = await generateMeta();
    // Food: X1/Product A (1), Y1/Product B (1)
    // Supplies: ""/Cleaning Supply (1)
    const row5 = sheet.getRow(5);
    expect(row5.getCell(1).value).toBe("Food");
    expect(row5.getCell(2).value).toBe("X1");
    expect(row5.getCell(3).value).toBe("Product A");
    expect(row5.getCell(4).value).toBe(1);

    const row6 = sheet.getRow(6);
    expect(row6.getCell(1).value).toBe("Food");
    expect(row6.getCell(2).value).toBe("Y1");
    expect(row6.getCell(3).value).toBe("Product B");
    expect(row6.getCell(4).value).toBe(1);

    const row7 = sheet.getRow(7);
    expect(row7.getCell(1).value).toBe("Supplies");
    expect(row7.getCell(2).value).toBe("");
    expect(row7.getCell(3).value).toBe("Cleaning Supply");
    expect(row7.getCell(4).value).toBe(1);
  });

  it("right-aligns Occurrences values in data rows", async () => {
    const sheet = await generateMeta();
    expect(sheet.getRow(5).getCell(4).alignment?.horizontal).toBe("right");
  });

  // ---- Aggregation ----

  it("aggregates duplicate items within a category", async () => {
    const dupeItems: CategoryExportLineItem[] = [
      ...lineItems,
      {
        invoice_id: "inv-2",
        item_code: "X1",
        description: "Product A",
        quantity: 3,
        size: null,
        unit: "EA",
        unit_price: 10.0,
        extended_price: 30.0,
        tax_amount: 2.55,
        category: "Food",
        account: 5000,
        sub_account: null,
      },
    ];
    const sheet = await generateMeta(invoices, dupeItems);
    // Food: X1/Product A should have count=2
    const row5 = sheet.getRow(5);
    expect(row5.getCell(2).value).toBe("X1");
    expect(row5.getCell(4).value).toBe(2);
  });

  // ---- Sorting ----

  it("sorts categories alphabetically with Uncategorized last", async () => {
    const itemsWithUncat: CategoryExportLineItem[] = [
      ...lineItems,
      {
        invoice_id: "inv-1",
        item_code: "Z1",
        description: "Misc Item",
        quantity: 1,
        size: null,
        unit: null,
        unit_price: 5.0,
        extended_price: 5.0,
        tax_amount: null,
        category: null,
        account: null,
        sub_account: null,
      },
    ];
    const sheet = await generateMeta(invoices, itemsWithUncat);

    const categories: string[] = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber <= 4) return;
      const cat = String(row.getCell(1).value ?? "");
      if (cat && !categories.includes(cat)) {
        categories.push(cat);
      }
    });

    expect(categories).toEqual(["Food", "Supplies", "Uncategorized"]);
  });

  // ---- Edge cases ----

  it("handles empty line items", async () => {
    const sheet = await generateMeta(invoices, []);
    expect(sheet.getRow(4).getCell(1).value).toBe("Category");
    expect(sheet.getRow(5).getCell(1).value).toBeNull();
  });
});
