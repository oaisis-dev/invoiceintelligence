"use client";

import { useCallback, useRef } from "react";

interface UseGridNavigationOptions {
  rowCount: number;
  colCount: number;
  onAddRow?: () => void;
}

export function useGridNavigation({
  rowCount,
  colCount,
  onAddRow,
}: UseGridNavigationOptions) {
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  const getKey = useCallback((row: number, col: number) => `${row}:${col}`, []);

  const registerRef = useCallback(
    (row: number, col: number) => (el: HTMLInputElement | null) => {
      const key = getKey(row, col);
      if (el) {
        inputRefs.current.set(key, el);
      } else {
        inputRefs.current.delete(key);
      }
    },
    [getKey]
  );

  const focusCell = useCallback(
    (row: number, col: number) => {
      const key = getKey(row, col);
      const el = inputRefs.current.get(key);
      if (el) {
        el.focus();
        el.select();
      }
    },
    [getKey]
  );

  const handleKeyDown = useCallback(
    (row: number, col: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Tab") {
        e.preventDefault();
        if (e.shiftKey) {
          // Move backward
          if (col > 0) {
            focusCell(row, col - 1);
          } else if (row > 0) {
            focusCell(row - 1, colCount - 1);
          }
        } else {
          // Move forward
          if (col < colCount - 1) {
            focusCell(row, col + 1);
          } else if (row < rowCount - 1) {
            focusCell(row + 1, 0);
          } else if (onAddRow) {
            // Tab from last cell of last row → add new row.
            // Wait for React to render the new row before focusing.
            onAddRow();
            const targetRow = row + 1;
            const tryFocus = (attempts: number) => {
              requestAnimationFrame(() => {
                const key = `${targetRow}:0`;
                if (inputRefs.current.has(key)) {
                  focusCell(targetRow, 0);
                } else if (attempts > 0) {
                  tryFocus(attempts - 1);
                }
              });
            };
            tryFocus(5);
          }
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        // Move down in same column
        if (row < rowCount - 1) {
          focusCell(row + 1, col);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        const el = e.currentTarget;
        el.blur();
      }
    },
    [rowCount, colCount, focusCell, onAddRow]
  );

  return { registerRef, handleKeyDown, focusCell };
}
