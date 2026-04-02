"use client";

import { useEffect, useCallback, useRef, useState } from "react";

/**
 * Generic polling hook for periodic data fetching.
 *
 * Use this for data that should stay reasonably fresh (like dashboard stats)
 * but doesn't warrant a real-time Supabase subscription.
 *
 * The fetcher is called immediately on mount and then every `intervalMs`
 * milliseconds. The interval resets if `fetcher` or `intervalMs` change.
 *
 * @param fetcher  - Async function that returns the data.
 * @param intervalMs - Polling interval in milliseconds.
 */
export function usePolling<T>(
  fetcher: () => Promise<T>,
  intervalMs: number
): {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Keep the fetcher in a ref so the interval doesn't need to be reset
  // when the fetcher identity changes (common with inline arrow fns).
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const isMountedRef = useRef(true);

  const execute = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await fetcherRef.current();
      if (isMountedRef.current) {
        setData(result);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // Initial fetch + polling interval
  useEffect(() => {
    isMountedRef.current = true;

    // Fire immediately
    execute();

    const id = setInterval(execute, intervalMs);

    return () => {
      isMountedRef.current = false;
      clearInterval(id);
    };
  }, [execute, intervalMs]);

  const refetch = useCallback(() => {
    execute();
  }, [execute]);

  return { data, isLoading, error, refetch };
}
