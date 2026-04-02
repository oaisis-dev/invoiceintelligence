"use client";

import { useCallback, useEffect, useState } from "react";
import { useSupabase } from "@/hooks/use-supabase";
import { getUnreadCount } from "@/lib/api-client";

/**
 * Fetches and caches the unread notification count.
 * Refreshes on Supabase Realtime INSERT/UPDATE events on user_notifications.
 *
 * Uses a counter-based trigger pattern to avoid the eslint
 * react-hooks/set-state-in-effect rule (no setState inside effect body).
 */
export function useUnreadCount() {
  const supabase = useSupabase();
  const [count, setCount] = useState(0);
  const [trigger, setTrigger] = useState(0);

  // Fetch whenever trigger changes (initial render + Realtime events + manual refresh)
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const result = await getUnreadCount();
        if (!cancelled) setCount(result.count);
      } catch {
        // Silently ignore — count stays stale until next refresh
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [trigger]);

  // Realtime subscription — bump trigger on changes
  useEffect(() => {
    const channel = supabase
      .channel("unread-count")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_notifications",
        },
        () => setTrigger((t) => t + 1)
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "user_notifications",
        },
        () => setTrigger((t) => t + 1)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const refresh = useCallback(() => {
    setTrigger((t) => t + 1);
  }, []);

  return { count, refresh };
}
