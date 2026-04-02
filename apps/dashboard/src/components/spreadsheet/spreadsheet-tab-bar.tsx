"use client";

import { X, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TabDef {
  id: string;
  label: string;
  closable: boolean;
}

export interface SpreadsheetTabBarProps {
  tabs: TabDef[];
  openTabs: string[];
  activeTab: string;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
  onReopen: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SpreadsheetTabBar({
  tabs,
  openTabs,
  activeTab,
  onActivate,
  onClose,
  onReopen,
}: SpreadsheetTabBarProps) {
  const closedTabs = tabs.filter((t) => !openTabs.includes(t.id));

  return (
    <>
      {openTabs.map((tabId) => {
        const tab = tabs.find((t) => t.id === tabId);
        if (!tab) return null;
        const isActive = activeTab === tabId;

        return (
          <button
            key={tabId}
            onClick={() => onActivate(tabId)}
            className={`group relative flex items-center gap-1 px-3 py-1 text-[11px] font-medium rounded-t transition-colors ${
              isActive
                ? "bg-white text-[#202124] border border-[#dadce0] border-b-white -mb-px z-10"
                : "text-[#636363] hover:text-[#202124] hover:bg-[#e8eaed]"
            }`}
          >
            {tab.label}
            {tab.closable && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(tabId);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                    onClose(tabId);
                  }
                }}
                className="ml-0.5 rounded-sm opacity-0 group-hover:opacity-100 hover:bg-[#dadce0] p-0.5 transition-opacity"
                aria-label={`Close ${tab.label}`}
              >
                <X className="size-2.5" />
              </span>
            )}
          </button>
        );
      })}

      {/* "+" button to reopen closed tabs */}
      {closedTabs.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center justify-center px-1.5 py-1 text-[11px] text-[#636363] hover:text-[#202124] hover:bg-[#e8eaed] rounded-t transition-colors"
              aria-label="Add tab"
            >
              <Plus className="size-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[120px]">
            {closedTabs.map((tab) => (
              <DropdownMenuItem
                key={tab.id}
                onClick={() => onReopen(tab.id)}
                className="text-xs"
              >
                {tab.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </>
  );
}
