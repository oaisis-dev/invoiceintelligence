"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useUnreadCount } from "@/hooks/use-unread-count";

interface UnreadCountContextValue {
  count: number;
  refresh: () => void;
}

const UnreadCountContext = createContext<UnreadCountContextValue | null>(null);

export function UnreadCountProvider({ children }: { children: ReactNode }) {
  const value = useUnreadCount();
  return (
    <UnreadCountContext.Provider value={value}>
      {children}
    </UnreadCountContext.Provider>
  );
}

export function useUnreadCountContext(): UnreadCountContextValue {
  const ctx = useContext(UnreadCountContext);
  if (!ctx) {
    throw new Error("useUnreadCountContext must be used within UnreadCountProvider");
  }
  return ctx;
}
