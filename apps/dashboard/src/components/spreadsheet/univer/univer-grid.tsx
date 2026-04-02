"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import type { SpreadsheetGridHandle, SpreadsheetGridProps, UniverAPI } from "./types";
import { toWorkbookData, replaceWorkbook, readGridData } from "./workbook-data";
import { registerEvents } from "./events";
import { searchCells, clearSearchHighlights } from "./search";
import type { SearchHighlight } from "./search";
import "./univer.css";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const SpreadsheetGrid = forwardRef<
  SpreadsheetGridHandle,
  SpreadsheetGridProps
>(function SpreadsheetGrid(
  // columnHeaders not used by Univer (jspreadsheet used it for sort-header workaround)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  { data, columns, columnHeaders, minRows, enabled, onDataChange, onSelectionChange },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const univerAPIRef = useRef<UniverAPI>(null);
  const suppressRef = useRef(false);
  const searchHighlightsRef = useRef<SearchHighlight[]>([]);

  // Keep latest callbacks/config in refs so event handlers see current values
  const onDataChangeRef = useRef(onDataChange);
  onDataChangeRef.current = onDataChange;
  const onSelectionChangeRef = useRef(onSelectionChange);
  onSelectionChangeRef.current = onSelectionChange;
  const columnsRef = useRef(columns);
  columnsRef.current = columns;
  const minRowsRef = useRef(minRows);
  minRowsRef.current = minRows;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getSheet = (): any | null => {
    const api = univerAPIRef.current;
    if (!api) return null;
    return api.getActiveWorkbook()?.getActiveSheet() ?? null;
  };

  // -------------------------------------------------------------------------
  // Imperative handle
  // -------------------------------------------------------------------------

  useImperativeHandle(ref, () => ({
    getData() {
      const sheet = getSheet();
      if (!sheet) return [];
      return readGridData(sheet);
    },

    setData(newData: (string | number)[][]) {
      const api = univerAPIRef.current;
      if (!api) return;
      suppressRef.current = true;
      replaceWorkbook(api, newData, columnsRef.current, minRowsRef.current);
      suppressRef.current = false;
    },

    getCellValue(col: number, row: number) {
      const sheet = getSheet();
      if (!sheet) return null;
      const val = sheet.getRange(row, col).getValue();
      return val != null ? String(val) : null;
    },

    setCellValue(col: number, row: number, value: string | number) {
      const sheet = getSheet();
      if (!sheet) return;
      sheet.getRange(row, col).setValue(value);
    },

    selectCell(col: number, row: number) {
      const sheet = getSheet();
      if (!sheet) return;
      sheet.getRange(row, col).activate();
    },

    focusGrid() {
      containerRef.current?.querySelector<HTMLElement>("canvas")?.focus();
    },

    searchCells(query: string) {
      clearSearchHighlights(getSheet(), searchHighlightsRef.current);
      if (!query) return null;
      const sheet = getSheet();
      if (!sheet) return null;
      return searchCells(sheet, query, searchHighlightsRef.current);
    },

    clearSearchHighlights() {
      clearSearchHighlights(getSheet(), searchHighlightsRef.current);
    },

    getContainer() {
      return containerRef.current;
    },
  }));

  // -------------------------------------------------------------------------
  // Mount Univer
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!containerRef.current || univerAPIRef.current || !enabled) return;
    let mounted = true;
    const disposables: { dispose: () => void }[] = [];

    (async () => {
      const { createUniver, LocaleType, mergeLocales } = await import(
        "@univerjs/presets"
      );
      const { UniverSheetsCorePreset } = await import(
        "@univerjs/preset-sheets-core"
      );
      const sheetsEnUS = (await import("@univerjs/preset-sheets-core/locales/en-US")).default;
      await import("@univerjs/preset-sheets-core/lib/index.css" as string);

      if (!mounted || !containerRef.current) return;

      const { univerAPI } = createUniver({
        locale: LocaleType.EN_US,
        locales: {
          [LocaleType.EN_US]: mergeLocales(sheetsEnUS),
        },
        presets: [
          UniverSheetsCorePreset({
            container: containerRef.current,
            header: false,
            toolbar: false,
            formulaBar: false,
            footer: false,
            contextMenu: true,
          }),
        ],
      });

      if (!mounted) {
        univerAPI.dispose();
        return;
      }

      univerAPIRef.current = univerAPI;

      // Create workbook with initial data
      univerAPI.createWorkbook(toWorkbookData(data, columns, minRows));

      // Register all event listeners
      disposables.push(
        ...registerEvents(univerAPI, {
          suppressRef,
          onDataChangeRef,
          onSelectionChangeRef,
          getSheet,
        }),
      );
    })();

    return () => {
      mounted = false;
      for (const d of disposables) {
        try { d.dispose(); } catch { /* ignore */ }
      }
      if (univerAPIRef.current) {
        try {
          univerAPIRef.current.dispose();
        } catch {
          // Ignore cleanup errors
        }
        univerAPIRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // -------------------------------------------------------------------------
  // Sync external data changes (undo/redo/reset) into the spreadsheet
  // -------------------------------------------------------------------------

  useEffect(() => {
    const api = univerAPIRef.current;
    if (!api) return;
    const sheet = getSheet();
    if (!sheet) return;

    // Compare current grid data with incoming prop.
    // readGridData already normalizes nulls to "", so only normalize `data`.
    const currentJson = JSON.stringify(readGridData(sheet));
    const incomingJson = JSON.stringify(
      data.map((row) => row.map((v) => (v != null ? v : ""))),
    );

    if (currentJson === incomingJson) return;

    suppressRef.current = true;
    replaceWorkbook(api, data, columns, minRows);
    suppressRef.current = false;
  }, [data, columns, minRows]);

  return (
    <div
      ref={containerRef}
      className="invoice-spreadsheet univer-host flex-1 overflow-auto"
    />
  );
});
