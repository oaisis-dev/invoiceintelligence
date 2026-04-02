"use client";

import { useSession } from "@clerk/nextjs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { useMemo } from "react";
import { getSupabaseUrl, getSupabasePublishableKey } from "@/lib/runtime-config";

/**
 * Creates a Supabase client authenticated with the current Clerk session JWT.
 *
 * Usage in client components:
 * ```tsx
 * const supabase = useSupabaseClient();
 * const { data } = await supabase.from("invoices").select("*");
 * ```
 */
export function useSupabaseClient(): SupabaseClient {
  const { session } = useSession();

  return useMemo(() => {
    return createClient(
      getSupabaseUrl(),
      getSupabasePublishableKey(),
      {
        global: {
          fetch: async (url, options = {}) => {
            let clerkToken: string | null = null;
            if (session) {
              try {
                clerkToken = await session.getToken({ template: "supabase" });
              } catch {
                clerkToken = await session.getToken();
              }
            }
            const headers = new Headers(options.headers);
            if (clerkToken) {
              headers.set("Authorization", `Bearer ${clerkToken}`);
            }
            return fetch(url, { ...options, headers });
          },
        },
      }
    );
  }, [session]);
}
