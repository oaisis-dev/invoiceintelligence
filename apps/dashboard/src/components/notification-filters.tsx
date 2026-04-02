"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { NotificationCategory } from "@/types/notifications";

export type NotificationFilter =
  | "all"
  | "unread"
  | "critical"
  | NotificationCategory;

const FILTER_OPTIONS: { value: NotificationFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "invoice", label: "Invoices" },
  { value: "member", label: "Members" },
  { value: "system", label: "System" },
  { value: "critical", label: "Critical" },
];

interface NotificationFiltersProps {
  value: NotificationFilter;
  onChange: (value: NotificationFilter) => void;
}

export function NotificationFilters({
  value,
  onChange,
}: NotificationFiltersProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => {
        if (v) onChange(v as NotificationFilter);
      }}
      className="justify-start"
    >
      {FILTER_OPTIONS.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          size="sm"
          className="text-xs px-3 h-7"
        >
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
