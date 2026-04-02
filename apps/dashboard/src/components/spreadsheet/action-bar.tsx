"use client";

import { Button } from "@/components/ui/button";
import { Loader2, Save, Undo2, Redo2, RotateCcw } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

export interface ActionBarProps {
  // Formula bar
  activeCell: { col: number; row: number; value: string };
  onFormulaChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFormulaKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  // Search
  searchQuery: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  // Toolbar actions
  saveState: SaveState;
  saveError: string | null;
  canUndo: boolean;
  canRedo: boolean;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ActionBar({
  activeCell,
  onFormulaChange,
  onFormulaKeyDown,
  searchQuery,
  onSearchChange,
  saveState,
  saveError,
  canUndo,
  canRedo,
  onSave,
  onUndo,
  onRedo,
  onReset,
}: ActionBarProps) {
  return (
    <div className="flex items-center px-1 border-b border-[#e0e0e0] gap-1 bg-white">
      {/* Cell reference */}
      <span className="w-12 text-[11px] font-medium text-[#636363] bg-[#f8f9fa] px-1.5 py-0.5 rounded-sm text-center border border-[#dadce0]">
        {String.fromCharCode(65 + activeCell.col)}
        {activeCell.row + 1}
      </span>
      <span className="text-[11px] text-[#636363] italic px-0.5">
        f<sub>x</sub>
      </span>
      {/* Formula input */}
      <input
        className="flex-1 text-[11px] font-[Arial,sans-serif] bg-transparent outline-none border-none py-1"
        value={activeCell.value}
        onChange={onFormulaChange}
        onKeyDown={onFormulaKeyDown}
        placeholder="Select a cell..."
      />
      {/* Separator */}
      <div className="w-px h-5 bg-[#dadce0]" />
      {/* Search input */}
      <div className="relative flex items-center">
        <svg
          className="absolute left-1.5 w-3 h-3 text-[#9aa0a6]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          className="w-40 text-[11px] font-[Arial,sans-serif] bg-[#f8f9fa] border border-[#dadce0] rounded-sm outline-none py-1 pl-6 pr-2 focus:border-[#1a73e8] focus:bg-white transition-colors"
          value={searchQuery}
          onChange={onSearchChange}
          placeholder="Search..."
        />
      </div>
      {/* Save / Undo / Redo / Reset */}
      <div className="w-px h-5 bg-[#dadce0]" />
      <Button
        size="sm"
        className="h-7 text-xs px-3"
        onClick={onSave}
        disabled={saveState !== "dirty" && saveState !== "error"}
      >
        {saveState === "saving" ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <Save className="size-3" />
        )}
        {saveState === "saving" ? "Saving..." : "Save"}
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        className="size-6"
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
      >
        <Undo2 className="size-3" />
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        className="size-6"
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo (Ctrl+Shift+Z)"
      >
        <Redo2 className="size-3" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-xs px-2"
        onClick={onReset}
        disabled={saveState === "idle" && !canUndo}
        title="Reset to last saved"
      >
        <RotateCcw className="size-3" />
        Reset
      </Button>
      {saveState === "error" && saveError && (
        <span className="text-[11px] text-destructive truncate max-w-48">
          {saveError}
        </span>
      )}
      {saveState === "saved" && (
        <span className="text-[11px] text-emerald-600">Saved</span>
      )}
    </div>
  );
}
