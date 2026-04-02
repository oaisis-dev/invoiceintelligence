"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { useSupabase } from "@/hooks/use-supabase";
import type { InvoiceStatus } from "@/types/database";

type InvoiceUpdate = {
  status: InvoiceStatus;
  progress: number;
};

/**
 * Subscribe to real-time invoice status and progress changes.
 *
 * Uses Supabase Realtime to listen for UPDATE events on the `invoices` table,
 * filtered to a provided set of invoice IDs. This is useful for showing live
 * progress bars and status badges while invoices are being processed.
 *
 * @param invoiceIds - Array of invoice IDs to watch. Pass an empty array to
 *   disable the subscription.
 * @returns A map of invoice ID -> { status, progress } for any invoices
 *   that have received updates since the hook mounted.
 */
export function useInvoiceProgress(invoiceIds: string[]) {
  const supabase = useSupabase();
  const [invoiceUpdates, setInvoiceUpdates] = useState<
    Map<string, InvoiceUpdate>
  >(new Map());

  // Keep a ref to the IDs so we can check membership without re-subscribing
  // on every render when the array contents haven't changed.
  const idsRef = useRef<Set<string>>(new Set());

  // Update the ref when IDs change
  useEffect(() => {
    idsRef.current = new Set(invoiceIds);
  }, [invoiceIds]);

  // Stable serialized key for the subscription dependency
  const idsKey = invoiceIds.slice().sort().join(",");

  const handlePayload = useCallback(
    (payload: { new: { id: string; status: string; progress: number } }) => {
      const row = payload.new;
      if (!idsRef.current.has(row.id)) return;

      setInvoiceUpdates((prev) => {
        const next = new Map(prev);
        next.set(row.id, {
          status: row.status as InvoiceStatus,
          progress: row.progress,
        });
        return next;
      });
    },
    []
  );

  useEffect(() => {
    if (invoiceIds.length === 0) return;

    const channel = supabase
      .channel(`invoice-progress:${idsKey}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "invoices",
        },
        handlePayload
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, idsKey, handlePayload, invoiceIds.length]);

  return { invoiceUpdates };
}
