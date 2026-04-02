import { NextResponse } from "next/server";
import { assertRole, requireAuthContext } from "@/lib/authz";
import {
  EMAIL_DISCOVERY_KEYWORDS,
  getEffectiveAllowedSenderScope,
} from "@/lib/email-sender-governance";
import { getDefaultLocationForOrg } from "@/lib/default-location";

/**
 * GET /api/settings/email-accounts
 * List connected inboxes for the current org.
 * Owners and managers can read inbox health; tokens are never returned.
 */
export async function GET() {
  const authResult = await requireAuthContext();
  if (authResult.error) return authResult.error;
  const { context } = authResult;

  const roleError = assertRole(context, ["admin", "manager"]);
  if (roleError) return roleError;

  let defaultLocation;
  try {
    defaultLocation = await getDefaultLocationForOrg(context.supabase, context.orgId);
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          message:
            error instanceof Error ? error.message : "Failed to load default location.",
        },
      },
      { status: 500 }
    );
  }

  const { data: currentAccount, error } = await context.supabase
    .from("email_accounts")
    .select(
      "id, org_id, location_id, provider, email_address, token_expires_at, subject_filter, is_active, last_polled_at, last_verified_at, last_verification_status, last_verification_error, last_error, consecutive_failures, disconnected_at, created_at, updated_at, location:locations(id, name, is_default)"
    )
    .eq("org_id", context.orgId)
    .order("is_active", { ascending: false })
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: { message: `Failed to fetch email accounts: ${error.message}` } },
      { status: 500 }
    );
  }

  const { data: allowedSenders, error: allowedSendersError } = await context.supabase
    .from("email_allowed_senders")
    .select("id, org_id, location_id, created_by, email_address, created_at, updated_at")
    .eq("org_id", context.orgId)
    .or(`location_id.is.null,location_id.eq.${defaultLocation.id}`)
    .order("email_address", { ascending: true });

  if (allowedSendersError) {
    return NextResponse.json(
      {
        error: {
          message: `Failed to fetch allowed senders: ${allowedSendersError.message}`,
        },
      },
      { status: 500 }
    );
  }

  const { data: recommendations, error: recommendationsError } = await context.supabase
    .from("email_sender_recommendations")
    .select(
      "id, org_id, location_id, email_account_id, sender_email, sender_name, sample_subject, status, source_reason, first_seen_at, last_seen_at, seen_count, created_at, updated_at"
    )
    .eq("org_id", context.orgId)
    .eq("location_id", defaultLocation.id)
    .eq("status", "pending")
    .order("last_seen_at", { ascending: false });

  if (recommendationsError) {
    return NextResponse.json(
      {
        error: {
          message: `Failed to fetch sender recommendations: ${recommendationsError.message}`,
        },
      },
      { status: 500 }
    );
  }

  const orgAllowedSenders = (allowedSenders ?? []).filter(
    (sender) => sender.location_id === null
  );
  const locationAllowedSenders = (allowedSenders ?? []).filter(
    (sender) => sender.location_id === defaultLocation.id
  );
  const effectiveScope = getEffectiveAllowedSenderScope({
    orgAllowedSenders,
    locationAllowedSenders,
  });

  return NextResponse.json({
    accounts: currentAccount ? [currentAccount] : [],
    sender_policy: {
      mode: effectiveScope === "none" ? "discovery" : "enforcement",
      effective_scope: effectiveScope,
      discovery_keywords: [...EMAIL_DISCOVERY_KEYWORDS],
      default_location: {
        id: defaultLocation.id,
        name: defaultLocation.name,
      },
      org_allowed_senders: orgAllowedSenders,
      location_allowed_senders: locationAllowedSenders,
    },
    recommendations: recommendations ?? [],
  });
}
