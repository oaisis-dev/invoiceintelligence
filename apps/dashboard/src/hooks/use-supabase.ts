"use client";

import { useSupabaseClient } from "@/lib/supabase/client";

/**
 * Returns an authenticated Supabase client for use in client components.
 * The browser client is configured with Clerk JWT injection
 * (see lib/supabase/client.ts).
 *
 * Re-exports useSupabaseClient under a shorter name for convenience.
 */
export function useSupabase() {
  return useSupabaseClient();
}
