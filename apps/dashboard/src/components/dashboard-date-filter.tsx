"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import type { DateRangePreset } from "@/types/analytics";
import { DEFAULT_RANGE } from "@/lib/date-range";

const PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "12m", label: "12 months" },
];

interface DashboardDateFilterProps {
  currentRange: DateRangePreset;
}

export function DashboardDateFilter({
  currentRange,
}: DashboardDateFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = useCallback(
    (range: DateRangePreset) => {
      const params = new URLSearchParams(searchParams.toString());
      if (range === DEFAULT_RANGE) {
        params.delete("range");
      } else {
        params.set("range", range);
      }
      const qs = params.toString();
      router.push(qs ? `/home?${qs}` : "/home");
    },
    [router, searchParams],
  );

  return (
    <div className="flex gap-1">
      {PRESETS.map(({ value, label }) => (
        <Button
          key={value}
          variant={value === currentRange ? "default" : "outline"}
          size="sm"
          className="h-8 text-[13px]"
          onClick={() => handleChange(value)}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}
