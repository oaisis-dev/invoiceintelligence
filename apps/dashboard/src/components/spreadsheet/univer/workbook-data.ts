// ---------------------------------------------------------------------------
// 2D array ↔ Univer workbook data conversion
// ---------------------------------------------------------------------------

import type { UniverAPI, UniverSheet } from "./types";

type CellData = Record<number, Record<number, { v: string | number }>>;
type ColumnData = Record<number, { w: number }>;

let workbookSeq = 0;

/** Convert a 2D data array + column config into Univer's IWorkbookData shape. */
export function toWorkbookData(
  data: (string | number)[][],
  columns: { width: number }[],
  minRows: number,
) {
  const cellData: CellData = {};
  for (let r = 0; r < data.length; r++) {
    cellData[r] = {};
    for (let c = 0; c < data[r].length; c++) {
      const val = data[r][c];
      if (val !== "" && val != null) {
        cellData[r][c] = { v: val };
      }
    }
  }
  const columnData: ColumnData = {};
  for (let c = 0; c < columns.length; c++) {
    columnData[c] = { w: columns[c].width };
  }
  const seq = ++workbookSeq;
  return {
    id: `invoice-workbook-${seq}`,
    name: "Invoice",
    sheetOrder: [`sheet-${seq}`],
    sheets: {
      [`sheet-${seq}`]: {
        id: `sheet-${seq}`,
        name: "Items",
        cellData,
        columnData,
        rowCount: Math.max(data.length, minRows, 20),
        columnCount: columns.length,
        defaultRowHeight: 21,
        defaultColumnWidth: 100,
        showGridlines: 1 as const,
        rowHeader: { width: 40 },
        columnHeader: { height: 20 },
      },
    },
  };
}

/**
 * Dispose the current workbook and create a new one with fresh data.
 * Returns true if a replacement was performed.
 */
export function replaceWorkbook(
  api: UniverAPI,
  data: (string | number)[][],
  columns: { width: number }[],
  minRows: number,
): boolean {
  const wb = api.getActiveWorkbook();
  if (wb) {
    api.disposeUnit(wb.getId());
  }
  api.createWorkbook(toWorkbookData(data, columns, minRows));
  return true;
}

/** Read all grid values as a 2D array with nulls replaced by empty strings. */
export function readGridData(sheet: UniverSheet): unknown[][] {
  const rowCount = sheet.getSheet().getRowCount();
  const colCount = sheet.getSheet().getColumnCount();
  const values = sheet.getRange(0, 0, rowCount, colCount).getValues() ?? [];
  return values.map((row: (string | number | boolean | null)[]) =>
    row.map((v: string | number | boolean | null) => (v != null ? v : "")),
  );
}
