import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

type DefaultLocationRow = {
  id: string;
  org_id: string;
  name: string;
  intake_email?: string | null;
  is_default: boolean;
};

export async function getDefaultLocationForOrg(
  supabase: SupabaseClient,
  orgId: string
) {
  const { data, error } = await supabase
    .from("locations")
    .select("id, org_id, name, intake_email, is_default")
    .eq("org_id", orgId)
    .eq("is_default", true)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load default location: ${error.message}`);
  }

  if (!data) {
    throw new Error("Workspace is missing a default location.");
  }

  return data as DefaultLocationRow;
}

export async function syncDefaultLocationInboxEmail(
  supabase: SupabaseClient,
  locationId: string,
  emailAddress: string | null
) {
  const { error } = await supabase
    .from("locations")
    .update({
      intake_email: emailAddress,
    })
    .eq("id", locationId);

  if (error) {
    throw new Error(`Failed to sync default location inbox: ${error.message}`);
  }
}
