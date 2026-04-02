import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase/server";
import { parseOrgSettings } from "@/lib/settings/export-routing";
import type {
  Location,
  Organization,
  UserRole,
} from "@/types/database";

export type SettingsLocation = Pick<Location, "id" | "name" | "is_active">;

export type OrgSettingsBundle = {
  organization: Organization | null;
  locations: SettingsLocation[];
};

/**
 * Fetch the current user's organization settings.
 * Uses the `current_user_org_id()` DB function via a users join to find the org.
 */
export async function getOrgSettingsBundle(): Promise<OrgSettingsBundle> {
  const supabase = await createServerClient();

  // RLS scopes users to the current org; grab the org_id from the first user row,
  // then fetch the organization. This avoids needing RLS on organizations itself.
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("org_id")
    .limit(1)
    .single();

  if (userError || !user) {
    return {
      organization: null,
      locations: [],
    };
  }

  const { data: orgData, error: orgError } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", user.org_id)
    .single();

  if (orgError) {
    if (orgError.code === "PGRST116") {
      return {
        organization: null,
        locations: [],
      };
    }
    throw new Error(`Failed to fetch org settings: ${orgError.message}`);
  }

  const { data: locationsData, error: locationsError } = await supabase
    .from("locations")
    .select("id, name, is_active")
    .eq("org_id", user.org_id)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (locationsError) {
    throw new Error(`Failed to fetch organization locations: ${locationsError.message}`);
  }

  const organization = {
    ...(orgData as Organization),
    settings: parseOrgSettings((orgData.settings ?? {}) as Record<string, unknown>),
  };

  return {
    organization,
    locations: (locationsData ?? []) as SettingsLocation[],
  };
}

export async function getOrgSettings(): Promise<Organization | null> {
  const { organization } = await getOrgSettingsBundle();
  return organization;
}

export async function getCurrentUserRole(): Promise<UserRole | null> {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }

  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("users")
    .select("role")
    .or(
      `external_id.eq.${userId},clerk_dev_id.eq.${userId},clerk_prod_id.eq.${userId}`
    )
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch current user role: ${error.message}`);
  }

  return (data?.role as UserRole | undefined) ?? null;
}

