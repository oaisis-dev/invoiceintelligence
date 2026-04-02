import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkspaceType } from "@/types/database";
import { getFreePlan, getPlanById } from "@/lib/billing/config";

type ProvisionParams = {
  email: string;
  displayName: string;
  clerkUserId: string;
  identityColumn: "clerk_dev_id" | "clerk_prod_id";
};

type ProvisionResult =
  | { orgId: string; locationId: string; userId: string; error: null }
  | { orgId: null; locationId: null; userId: null; error: string };

type ExistingUserLinkResult =
  | {
      userId: string;
      orgId: string;
      role: string;
      error: null;
    }
  | {
      userId: null;
      orgId: null;
      role: null;
      error: string;
    };

type ExistingUserIdentityRow = {
  id: string;
  org_id: string;
  role: string;
  is_active: boolean;
  external_id?: string | null;
  clerk_dev_id?: string | null;
  clerk_prod_id?: string | null;
};

const PERSONAL_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "yahoo.com",
  "ymail.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
]);

export function getIdentityColumnFromEnv(): "clerk_dev_id" | "clerk_prod_id" {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  if (key.startsWith("pk_test_")) {
    return "clerk_dev_id";
  }
  return "clerk_prod_id";
}

export function buildDisplayName(email: string, displayName?: string | null) {
  const normalized = displayName?.trim();
  if (normalized) {
    return normalized;
  }
  return email.split("@")[0] ?? "Workspace Owner";
}

export function normalizeWorkspaceName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function toPossessive(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    return "My";
  }
  return trimmed.endsWith("s") ? `${trimmed}'` : `${trimmed}'s`;
}

function extractEmailDomain(email: string) {
  return email.split("@")[1]?.toLowerCase() ?? "";
}

function toTitleCase(value: string) {
  return value
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function buildSuggestedWorkspaceName(params: {
  email: string;
  displayName: string;
  workspaceType: WorkspaceType;
}) {
  const displayName = params.displayName.trim() || params.email.split("@")[0] || "My";
  if (params.workspaceType === "individual") {
    return `${toPossessive(displayName)} Workspace`;
  }

  const domain = extractEmailDomain(params.email);
  if (domain && !PERSONAL_EMAIL_DOMAINS.has(domain)) {
    const companyName = toTitleCase(domain.split(".")[0] ?? "");
    if (companyName) {
      return companyName;
    }
  }

  return `${toPossessive(displayName)} Team`;
}

export function slugifyWorkspaceName(name: string) {
  const slug = name
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return slug || "workspace";
}

export async function buildUniqueWorkspaceSlug(
  supabase: SupabaseClient,
  workspaceName: string
) {
  const baseSlug = slugifyWorkspaceName(workspaceName);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate =
      attempt === 0
        ? baseSlug
        : `${baseSlug}-${Math.random().toString(36).slice(2, 8)}`;

    const { data, error } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to validate workspace slug: ${error.message}`);
    }

    if (!data) {
      return candidate;
    }
  }

  return `${baseSlug}-${Date.now().toString(36).slice(-6)}`;
}

export async function configureProvisionedWorkspace(
  supabase: SupabaseClient,
  params: {
    orgId: string;
    workspaceName: string;
    workspaceType: WorkspaceType;
    planId?: string;
  }
) {
  const normalizedName = normalizeWorkspaceName(params.workspaceName);
  const slug = await buildUniqueWorkspaceSlug(supabase, normalizedName);

  // Resolve plan: use provided planId if valid + free, otherwise fall back to default free plan
  let resolvedPlan: Awaited<ReturnType<typeof getFreePlan>>;

  if (params.planId) {
    const requestedPlan = await getPlanById(supabase, params.planId);
    if (
      requestedPlan &&
      requestedPlan.is_active &&
      requestedPlan.workspace_type === params.workspaceType &&
      requestedPlan.price_cents === 0 &&
      requestedPlan.tier !== "enterprise"
    ) {
      resolvedPlan = requestedPlan;
    } else {
      resolvedPlan = await getFreePlan(supabase, params.workspaceType);
    }
  } else {
    resolvedPlan = await getFreePlan(supabase, params.workspaceType);
  }

  const { error } = await supabase
    .from("organizations")
    .update({
      name: normalizedName,
      slug,
      workspace_type: params.workspaceType,
      plan_id: resolvedPlan.id,
      monthly_invoice_limit: resolvedPlan.monthly_invoice_limit,
      max_users: resolvedPlan.max_users,
    })
    .eq("id", params.orgId);

  if (error) {
    throw new Error(`Failed to configure workspace: ${error.message}`);
  }

  return { name: normalizedName, slug };
}

export async function linkExistingUserIdentity(
  supabase: SupabaseClient,
  params: {
    email: string;
    displayName: string;
    clerkUserId: string;
    identityColumn: "clerk_dev_id" | "clerk_prod_id";
  }
): Promise<ExistingUserLinkResult | null> {
  const { data: existingUser, error: lookupError } = await supabase
    .from("users")
    .select("id, org_id, role, is_active, external_id, clerk_dev_id, clerk_prod_id")
    .ilike("email", params.email)
    .maybeSingle();

  if (lookupError) {
    return {
      userId: null,
      orgId: null,
      role: null,
      error: lookupError.message,
    };
  }

  if (!existingUser) {
    return null;
  }

  const identityRow = existingUser as ExistingUserIdentityRow;

  // Only check the identity column we're about to write to.  A user can
  // legitimately have different IDs in clerk_dev_id vs clerk_prod_id (local
  // dev uses the test Clerk instance while production uses the live one).
  const existingValueForColumn = identityRow[params.identityColumn]?.trim();

  // Allow re-linking if the user was deactivated (e.g. deleted from Clerk then re-signed up).
  // Block re-linking only if the user is active AND the target column is
  // already set to a *different* Clerk account.
  if (
    existingUser.is_active &&
    existingValueForColumn &&
    existingValueForColumn !== params.clerkUserId
  ) {
    return {
      userId: null,
      orgId: null,
      role: null,
      error: "Existing user is already linked to another Clerk account.",
    };
  }

  const updateFields: Record<string, string | boolean> = {
    external_id: params.clerkUserId,
    [params.identityColumn]: params.clerkUserId,
    is_active: true,
  };

  if (params.displayName.trim()) {
    updateFields.display_name = params.displayName.trim();
  }

  const { error: updateError } = await supabase
    .from("users")
    .update(updateFields)
    .eq("id", existingUser.id);

  if (updateError) {
    return {
      userId: null,
      orgId: null,
      role: null,
      error: updateError.message,
    };
  }

  return {
    userId: existingUser.id as string,
    orgId: existingUser.org_id as string,
    role: existingUser.role as string,
    error: null,
  };
}

/**
 * Calls the `provision_new_account` DB function to atomically create
 * an organization, default location, and admin user in a single transaction.
 *
 * Requires a Supabase admin client (service role) since the caller
 * won't have an org_id in their JWT yet.
 */
export async function provisionNewAccount(
  supabase: SupabaseClient,
  params: ProvisionParams
): Promise<ProvisionResult> {
  const { data, error } = await supabase.rpc("provision_new_account", {
    p_email: params.email,
    p_display_name: params.displayName,
    p_clerk_user_id: params.clerkUserId,
    p_identity_column: params.identityColumn,
  });

  if (error) {
    return { orgId: null, locationId: null, userId: null, error: error.message };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.org_id) {
    return {
      orgId: null,
      locationId: null,
      userId: null,
      error: "provision_new_account returned no data",
    };
  }

  return {
    orgId: row.org_id as string,
    locationId: row.location_id as string,
    userId: row.user_id as string,
    error: null,
  };
}
