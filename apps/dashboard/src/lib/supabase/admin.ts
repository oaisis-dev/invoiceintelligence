import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseUrl } from "@/lib/runtime-config";

/**
 * Admin Supabase client that uses the secret key.
 * This client bypasses Row Level Security (RLS) and should ONLY be used
 * in trusted server-side contexts such as webhook handlers and admin
 * operations. Never expose this client or the secret key to the browser.
 */
export function createAdminClient(): SupabaseClient {
  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SECRET_KEY environment variables"
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
