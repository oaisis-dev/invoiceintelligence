import "server-only";

import { auth } from "@clerk/nextjs/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";
import { getSupabaseUrl, getSupabasePublishableKey } from "@/lib/runtime-config";

const getSupabaseToken = cache(async () => {
  const { getToken } = await auth();
  try {
    return await getToken({ template: "supabase" });
  } catch {
    // Fallback: use default JWT if "supabase" template is not configured in Clerk
    return getToken();
  }
});

/**
 * Creates an authenticated Supabase client for use in Server Components,
 * Route Handlers, and Server Actions. The Clerk session JWT is passed
 * as the Authorization header so that Supabase RLS policies can verify
 * the requesting user.
 *
 * Usage:
 * ```ts
 * const supabase = await createServerClient();
 * const { data } = await supabase.from("invoices").select("*");
 * ```
 */
export async function createServerClient(): Promise<SupabaseClient> {
  const token = await getSupabaseToken();

  return createClient(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      global: {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
    }
  );
}
