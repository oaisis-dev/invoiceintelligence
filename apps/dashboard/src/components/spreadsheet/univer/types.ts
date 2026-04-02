// ---------------------------------------------------------------------------
// Shared interface contract — identical to spreadsheet-grid.tsx.
// The orchestrator (invoice-spreadsheet-view.tsx) depends on these types only.
// ---------------------------------------------------------------------------

export interface SpreadsheetGridProps {
  data: (string | number)[][];
  columns: { width: number }[];
  columnHeaders: string[];
  minRows: number;
  enabled: boolean;
  onDataChange: () => void;
  onSelectionChange: (col: number, row: number, rawValue: string) => void;
}

export interface SpreadsheetGridHandle {
  getData(): unknown[][];
  setData(data: (string | number)[][]): void;
  getCellValue(col: number, row: number, raw?: boolean): string | null;
  setCellValue(col: number, row: number, value: string | number): void;
  selectCell(col: number, row: number): void;
  focusGrid(): void;
  searchCells(query: string): { col: number; row: number } | null;
  clearSearchHighlights(): void;
  getContainer(): HTMLDivElement | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type UniverAPI = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type UniverSheet = any;
