import { createServerClient } from "@/lib/supabase/server";
import type { User } from "@/types/database";

/**
 * Resolve the current Clerk user to the application user record.
 * The Supabase JWT contains the Clerk subject; RLS on `users`
 * is scoped to the matching org. We simply fetch the first active row.
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("is_active", true)
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No matching user row
      return null;
    }
    throw new Error(`Failed to fetch current user: ${error.message}`);
  }

  return data as User;
}
