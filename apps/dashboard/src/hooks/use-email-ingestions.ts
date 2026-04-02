"use client";

import { useEffect, useCallback, useState } from "react";
import { useSupabase } from "@/hooks/use-supabase";
import type { EmailIngestion } from "@/types/database";

/**
 * Subscribe to real-time INSERT events on the `email_ingestions` table.
 * Useful for showing live "new email received" notifications in the UI.
 *
 * RLS on email_ingestions is org-scoped, so only the current user's org
 * events are received.
 *
 * @returns
 *  - `newEmails`: Array of newly inserted email ingestion records.
 *  - `clearNew`: Resets the newEmails array.
 */
export function useEmailIngestions() {
  const supabase = useSupabase();
  const [newEmails, setNewEmails] = useState<EmailIngestion[]>([]);

  const clearNew = useCallback(() => {
    setNewEmails([]);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("new-email-ingestions")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "email_ingestions",
        },
        (payload: { new: Record<string, unknown> }) => {
          const email = payload.new as unknown as EmailIngestion;
          setNewEmails((prev) => [email, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  return { newEmails, clearNew };
}
