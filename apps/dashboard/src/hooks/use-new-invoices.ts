"use client";

import { useEffect, useCallback, useState } from "react";
import { useSupabase } from "@/hooks/use-supabase";
import type { Invoice } from "@/types/database";

/**
 * Subscribe to real-time INSERT events on the `invoices` table for the
 * current org. Useful for showing "new invoice" toasts or updating counts
 * without a full page refresh.
 *
 * RLS ensures only invoices for the authenticated user's org are received.
 *
 * @returns
 *  - `newInvoices`: Array of newly inserted invoices since mount (or last clear).
 *  - `clearNew`: Resets the newInvoices array.
 */
export function useNewInvoices() {
  const supabase = useSupabase();
  const [newInvoices, setNewInvoices] = useState<Invoice[]>([]);

  const clearNew = useCallback(() => {
    setNewInvoices([]);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("new-invoices")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "invoices",
        },
        (payload: { new: Record<string, unknown> }) => {
          const invoice = payload.new as unknown as Invoice;
          setNewInvoices((prev) => [invoice, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  return { newInvoices, clearNew };
}
