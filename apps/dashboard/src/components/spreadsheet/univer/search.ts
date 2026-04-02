// ---------------------------------------------------------------------------
// Search and highlight operations on the Univer grid
// ---------------------------------------------------------------------------

import type { UniverSheet } from "./types";

export interface SearchHighlight {
  row: number;
  col: number;
  prev: string;
}

/**
 * Search all cells for a query string (case-insensitive).
 * Highlights matching cells with yellow background and activates the first match.
 * Returns the first match coordinates or null.
 */
export function searchCells(
  sheet: UniverSheet,
  query: string,
  highlights: SearchHighlight[],
): { col: number; row: number } | null {
  const rowCount = sheet.getSheet().getRowCount();
  const colCount = sheet.getSheet().getColumnCount();
  const allValues =
    sheet.getRange(0, 0, rowCount, colCount).getValues() ?? [];
  const lowerQuery = query.toLowerCase();
  let firstMatch: { col: number; row: number } | null = null;

  for (let r = 0; r < allValues.length; r++) {
    const row = allValues[r];
    if (!Array.isArray(row)) continue;
    for (let c = 0; c < row.length; c++) {
      const val = row[c];
      if (val == null) continue;
      const text = String(val);
      if (text.toLowerCase().includes(lowerQuery)) {
        const prev = sheet.getRange(r, c).getBackground() || "";
        highlights.push({ row: r, col: c, prev });
        sheet.getRange(r, c).setBackgroundColor("#fff2cc");
        if (!firstMatch) {
          firstMatch = { col: c, row: r };
        }
      }
    }
  }

  if (firstMatch) {
    sheet.getRange(firstMatch.row, firstMatch.col).activate();
  }
  return firstMatch;
}

/** Remove all search highlights, restoring original backgrounds. */
export function clearSearchHighlights(
  sheet: UniverSheet | null,
  highlights: SearchHighlight[],
): void {
  if (!sheet) return;
  for (const h of highlights) {
    try {
      if (h.prev) {
        sheet.getRange(h.row, h.col).setBackgroundColor(h.prev);
      } else {
        sheet.getRange(h.row, h.col).setBackgroundColor("#ffffff");
      }
    } catch {
      // Cell may no longer exist after row deletion
    }
  }
  highlights.length = 0;
}
