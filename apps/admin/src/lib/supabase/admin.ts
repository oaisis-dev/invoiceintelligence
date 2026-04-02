import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Admin Supabase client that uses the service role key.
 * This client bypasses Row Level Security (RLS) and is the ONLY
 * Supabase client in the admin app -- there is no anon key client.
 */
export function createAdminClient(): SupabaseClient {
  const supabaseUrl = process.env.SUPABASE_URL;
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
