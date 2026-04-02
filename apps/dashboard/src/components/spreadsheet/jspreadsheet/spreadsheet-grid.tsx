"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import type { WorksheetInstance } from "jspreadsheet-ce";
import "./jspreadsheet.css";

// ---------------------------------------------------------------------------
// Public types
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const SpreadsheetGrid = forwardRef<
  SpreadsheetGridHandle,
  SpreadsheetGridProps
>(function SpreadsheetGrid(
  { data, columns, columnHeaders, minRows, enabled, onDataChange, onSelectionChange },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const worksheetsRef = useRef<WorksheetInstance[] | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jssModuleRef = useRef<any>(null);
  const suppressRef = useRef(false);
  const searchHighlightsRef = useRef<HTMLElement[]>([]);

  // Keep latest callbacks in refs so jspreadsheet event handlers always call current versions
  const onDataChangeRef = useRef(onDataChange);
  onDataChangeRef.current = onDataChange;
  const onSelectionChangeRef = useRef(onSelectionChange);
  onSelectionChangeRef.current = onSelectionChange;
  const columnHeadersRef = useRef(columnHeaders);
  columnHeadersRef.current = columnHeaders;

  // Helper to get the active worksheet instance
  const getWorksheet = (): WorksheetInstance | null =>
    worksheetsRef.current?.[0] ?? null;

  // -------------------------------------------------------------------------
  // Imperative handle
  // -------------------------------------------------------------------------

  useImperativeHandle(ref, () => ({
    getData() {
      return (getWorksheet()?.getData() as unknown[][]) ?? [];
    },
    setData(newData: (string | number)[][]) {
      const ws = getWorksheet();
      if (!ws) return;
      suppressRef.current = true;
      ws.setData(newData);
      suppressRef.current = false;
    },
    getCellValue(col: number, row: number, raw = false) {
      const ws = getWorksheet();
      if (!ws) return null;
      const val = ws.getValueFromCoords(col, row, raw);
      return val != null ? String(val) : null;
    },
    setCellValue(col: number, row: number, value: string | number) {
      const ws = getWorksheet();
      if (!ws) return;
      ws.setValueFromCoords(col, row, value);
    },
    selectCell(col: number, row: number) {
      const ws = getWorksheet();
      if (!ws) return;
      ws.updateSelectionFromCoords(col, row, col, row);
    },
    focusGrid() {
      containerRef.current
        ?.querySelector<HTMLElement>(".jss_worksheet")
        ?.focus();
    },
    searchCells(query: string) {
      // Clear previous highlights
      for (const el of searchHighlightsRef.current) {
        el.style.removeProperty("background-color");
      }
      searchHighlightsRef.current = [];

      if (!query || !containerRef.current) return null;

      const cells = containerRef.current.querySelectorAll<HTMLTableCellElement>(
        ".jss_worksheet > tbody > tr > td",
      );
      const result: { col: number; row: number } = { col: -1, row: -1 };
      let found = false;

      cells.forEach((td) => {
        // Skip row number cells (first column)
        if (td.cellIndex === 0) return;
        const text = td.textContent ?? "";
        if (text.toLowerCase().includes(query.toLowerCase())) {
          td.style.backgroundColor = "#fff2cc";
          searchHighlightsRef.current.push(td);
          if (!found) {
            result.col = td.cellIndex - 1; // cellIndex includes row-number col
            result.row =
              (td.parentElement as HTMLTableRowElement).rowIndex - 1; // subtract header row
            found = true;
            td.scrollIntoView({ block: "center", inline: "center" });
          }
        }
      });

      // Select first match in the grid
      if (found) {
        const ws = getWorksheet();
        if (ws) {
          ws.updateSelectionFromCoords(
            result.col,
            result.row,
            result.col,
            result.row,
          );
        }
        return result;
      }

      return null;
    },
    clearSearchHighlights() {
      for (const el of searchHighlightsRef.current) {
        el.style.removeProperty("background-color");
      }
      searchHighlightsRef.current = [];
    },
    getContainer() {
      return containerRef.current;
    },
  }));

  // -------------------------------------------------------------------------
  // Mount jspreadsheet
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!containerRef.current || worksheetsRef.current || !enabled) return;
    let mounted = true;

    (async () => {
      const jssModule = (await import("jspreadsheet-ce")).default;
      jssModuleRef.current = jssModule;
      // CSS imports — safe to call multiple times, webpack deduplicates
      await import("jspreadsheet-ce/dist/jspreadsheet.css" as string);
      await import("jsuites/dist/jsuites.css" as string);

      if (!mounted || !containerRef.current) return;

      // Inject overrides AFTER jspreadsheet CSS is loaded (cascade order matters)
      if (!document.getElementById("jss-overrides")) {
        const style = document.createElement("style");
        style.id = "jss-overrides";
        style.textContent = `
          .invoice-spreadsheet .jss_worksheet > tbody > tr > td { font-size: 12px !important; font-family: Arial, sans-serif !important; height: 21px !important; line-height: 21px !important; padding: 1px 4px !important; }
          .invoice-spreadsheet .jss_worksheet > thead > tr > td { font-size: 10px !important; height: 20px !important; line-height: 20px !important; padding: 2px 8px !important; color: #636363 !important; background: #f8f9fa !important; }
          .invoice-spreadsheet .jss_worksheet > tbody > tr > td:first-child { font-size: 10px !important; color: #636363 !important; background: #f8f9fa !important; }
          .invoice-spreadsheet .jss_editor, .invoice-spreadsheet .jss_worksheet td > input { font-size: 12px !important; font-family: Arial, sans-serif !important; }
        `;
        document.head.appendChild(style);
      }

      const syncViaCallback = () => {
        if (!suppressRef.current) onDataChangeRef.current();
      };
      const syncViaCallbackRAF = () => {
        requestAnimationFrame(syncViaCallback);
      };

      const result = jssModule(containerRef.current, {
        about: false,
        tabs: false,
        parseFormulas: true,
        autoCasting: true,
        // Prevent editing the header row (row 0) — return original value to cancel
        onbeforechange: (
          instance: WorksheetInstance,
          _cell: HTMLTableCellElement,
          colIndex: string | number,
          rowIndex: string | number,
          newValue: import("jspreadsheet-ce").CellValue,
        ) => {
          if (Number(rowIndex) === 0) {
            return instance.getValueFromCoords(Number(colIndex), 0, false) ?? "";
          }
          return newValue;
        },
        // Prevent deleting or inserting before the header row
        onbeforedeleterow: (
          _instance: WorksheetInstance,
          removedRows: number[],
        ) => {
          if (removedRows.includes(0)) return false;
          return undefined;
        },
        onbeforeinsertrow: (
          _instance: WorksheetInstance,
          rows: { row: number }[],
        ) => {
          if (rows.some((r) => r.row === 0)) return false;
          return undefined;
        },
        onafterchanges: syncViaCallback,
        oninsertrow: syncViaCallbackRAF,
        ondeleterow: syncViaCallbackRAF,
        onmoverow: syncViaCallbackRAF,
        onpaste: syncViaCallbackRAF,
        onsort: (instance: WorksheetInstance) => {
          // Built-in sort may displace the header row — move it back to row 0
          const sortedData = instance.getData() as string[][];
          for (let r = 0; r < sortedData.length; r++) {
            if (sortedData[r][0] === columnHeadersRef.current[0]) {
              if (r !== 0) {
                instance.moveRow(r, 0);
              }
              break;
            }
          }
          requestAnimationFrame(syncViaCallback);
        },
        onselection: (
          worksheetInstance: WorksheetInstance,
          x1: number | string,
          y1: number | string,
        ) => {
          const col = Number(x1);
          const row = Number(y1);
          // Get raw value (formula text like "=A1*B1", not computed result)
          const value = worksheetInstance?.getValueFromCoords?.(col, row, false);
          onSelectionChangeRef.current(
            col,
            row,
            value != null ? String(value) : "",
          );
        },
        // Custom context menu — only row insert/delete, no copy/paste/save
        contextMenu: (
          _instance: WorksheetInstance,
          _colIndex: string | number | null,
          _rowIndex: string | number | null,
          _event: PointerEvent,
          items: import("jspreadsheet-ce").ContextMenuItem[],
        ) => {
          // Filter out unwanted items
          const filtered = items.filter((item) => {
            if (!("title" in item) || !item.title) return true; // keep separators
            const t = item.title.toLowerCase();
            if (
              t.includes("copy") ||
              t.includes("paste") ||
              t.includes("save") ||
              t.includes("about") ||
              t.includes("download") ||
              t.includes("comment")
            )
              return false;
            return true;
          });
          // Remove consecutive separators and leading/trailing separators
          const cleaned: typeof filtered = [];
          for (const item of filtered) {
            const isSep = !("title" in item) || !item.title;
            if (
              isSep &&
              (cleaned.length === 0 ||
                !("title" in cleaned[cleaned.length - 1]!) ||
                !cleaned[cleaned.length - 1]!.title)
            )
              continue;
            cleaned.push(item);
          }
          // Remove trailing separator
          while (
            cleaned.length > 0 &&
            (!("title" in cleaned[cleaned.length - 1]!) ||
              !cleaned[cleaned.length - 1]!.title)
          )
            cleaned.pop();
          return cleaned;
        },
        worksheets: [
          {
            data,
            columns: columns as import("jspreadsheet-ce").Column[],
            minDimensions: [columns.length, Math.max(minRows, 1)],
            allowInsertRow: true,
            allowDeleteRow: true,
            allowInsertColumn: false,
            allowDeleteColumn: false,
            allowRenameColumn: false,
            allowManualInsertRow: false,
            allowManualInsertColumn: false,
            columnDrag: false,
            rowDrag: true,
            columnResize: true,
            columnSorting: true,
            search: false,
            tableOverflow: false,
            defaultColAlign: "left",
          },
        ],
      });
      worksheetsRef.current = result;

      // Make header row (row 1) cells read-only
      const ws = result[0];
      if (ws) {
        for (let col = 0; col < columns.length; col++) {
          const cellName = String.fromCharCode(65 + col) + "1";
          ws.setReadOnly(cellName, true);
        }
      }
    })();

    return () => {
      mounted = false;
      if (
        worksheetsRef.current &&
        containerRef.current &&
        jssModuleRef.current
      ) {
        try {
          jssModuleRef.current.destroy(containerRef.current);
        } catch {
          // Ignore cleanup errors
        }
        worksheetsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // -------------------------------------------------------------------------
  // Sync external data changes (undo/redo/reset) into the spreadsheet
  // -------------------------------------------------------------------------

  useEffect(() => {
    const ws = getWorksheet();
    if (!ws) return;
    const currentData = JSON.stringify(ws.getData());
    const newData = JSON.stringify(data);
    if (currentData === newData) return;

    suppressRef.current = true;
    ws.setData(data);
    suppressRef.current = false;
  }, [data]);

  return (
    <div
      ref={containerRef}
      className="invoice-spreadsheet flex-1 overflow-auto"
    />
  );
});
