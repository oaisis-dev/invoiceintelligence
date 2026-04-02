// ---------------------------------------------------------------------------
// Univer event listener registration
// ---------------------------------------------------------------------------

import type { MutableRefObject } from "react";
import type { UniverAPI, UniverSheet } from "./types";

interface Disposable {
  dispose: () => void;
}

interface EventRefs {
  suppressRef: MutableRefObject<boolean>;
  onDataChangeRef: MutableRefObject<() => void>;
  onSelectionChangeRef: MutableRefObject<
    (col: number, row: number, rawValue: string) => void
  >;
  getSheet: () => UniverSheet | null;
}

/**
 * Register all Univer event listeners. Returns an array of disposables
 * that should be cleaned up on unmount.
 */
export function registerEvents(
  api: UniverAPI,
  refs: EventRefs,
): Disposable[] {
  const { suppressRef, onDataChangeRef, onSelectionChangeRef, getSheet } = refs;
  const disposables: Disposable[] = [];

  // Prevent editing header row (row 0)
  disposables.push(
    api.addEvent(
      api.Event.BeforeSheetEditStart,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (params: any) => {
        if (params.row === 0) {
          params.cancel = true;
        }
      },
    ),
  );

  // Cell edit ended -> notify parent
  disposables.push(
    api.addEvent(
      api.Event.SheetEditEnded,
      () => {
        if (!suppressRef.current) {
          onDataChangeRef.current();
        }
      },
    ),
  );

  // Selection changed -> update formula bar
  disposables.push(
    api.addEvent(
      api.Event.SelectionChanged,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (params: any) => {
        const selections = params.selections;
        if (!selections || selections.length === 0) return;
        const sel = selections[0];
        const row = sel.startRow;
        const col = sel.startColumn;
        const sheet = getSheet();
        if (!sheet) return;
        const val = sheet.getRange(row, col).getValue();
        onSelectionChangeRef.current(
          col,
          row,
          val != null ? String(val) : "",
        );
      },
    ),
  );

  // Clipboard paste -> notify parent
  disposables.push(
    api.addEvent(
      api.Event.ClipboardPasted,
      () => {
        if (!suppressRef.current) {
          requestAnimationFrame(() => onDataChangeRef.current());
        }
      },
    ),
  );

  // Row insert/delete commands -> notify parent
  disposables.push(
    api.onCommandExecuted(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (command: any) => {
        const id = command.id || "";
        if (
          id.includes("insert-row") ||
          id.includes("remove-row") ||
          id.includes("InsertRow") ||
          id.includes("RemoveRow")
        ) {
          if (!suppressRef.current) {
            requestAnimationFrame(() => onDataChangeRef.current());
          }
        }
      },
    ),
  );

  return disposables;
}
