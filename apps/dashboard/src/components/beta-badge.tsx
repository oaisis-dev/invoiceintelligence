"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import "@/lib/runtime-config"; // Window type declarations

const subscribe = () => () => {};
function getSnapshot(): string {
  return window.__APP_ENV__ || "";
}
function getServerSnapshot(): string {
  return "";
}

interface EnvironmentBadgeProps {
  className?: string;
}

export function EnvironmentBadge({ className }: EnvironmentBadgeProps) {
  const env = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!env || env === "production") return null;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border border-[var(--primary)]/15 bg-[var(--primary)]/[0.08] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--primary)] shadow-[0_1px_2px_rgba(39,101,61,0.08)] backdrop-blur-sm",
        className
      )}
    >
      {env}
    </span>
  );
}

/** @deprecated Use EnvironmentBadge instead */
export const BetaBadge = EnvironmentBadge;
