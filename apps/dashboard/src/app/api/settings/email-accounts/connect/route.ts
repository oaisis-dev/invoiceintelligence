import { NextRequest, NextResponse } from "next/server";
import { assertRole, requireAuthContext } from "@/lib/authz";
import { getDefaultLocationForOrg } from "@/lib/default-location";
import {
  buildProviderAuthorizationUrl,
  createEmailOAuthState,
  getEmailProviderConfig,
  resolveEmailProvider,
} from "@/lib/email-providers";

/**
 * POST /api/settings/email-accounts/connect?provider=google|microsoft&location_id=<uuid>
 * Returns the OAuth authorization URL the frontend should redirect to.
 * Admin only.
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuthContext();
  if (authResult.error) return authResult.error;
  const { context } = authResult;

  const roleError = assertRole(context, ["admin"]);
  if (roleError) return roleError;

  const { searchParams } = new URL(request.url);
  const provider = resolveEmailProvider(searchParams.get("provider"));
  const locationId = searchParams.get("location_id") || null;

  if (!provider) {
    return NextResponse.json(
      { error: { message: "Provider must be either 'google' or 'microsoft'" } },
      { status: 400 }
    );
  }

  const { data: existingAccount, error: existingAccountError } = await context.supabase
    .from("email_accounts")
    .select("id, email_address, is_active")
    .eq("org_id", context.orgId)
    .order("is_active", { ascending: false })
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingAccountError) {
    return NextResponse.json(
      { error: { message: `Failed to inspect current inbox: ${existingAccountError.message}` } },
      { status: 500 }
    );
  }

  if (existingAccount) {
    return NextResponse.json(
      {
        error: {
          code: "ACTIVE_INBOX_EXISTS",
          message: `Disconnect ${existingAccount.email_address} before connecting a different inbox.`,
        },
      },
      { status: 409 }
    );
  }

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

  if (locationId && locationId !== defaultLocation.id) {
    return NextResponse.json(
      {
        error: {
          message:
            "The inbox must stay attached to the workspace default location.",
        },
      },
      { status: 400 }
    );
  }

  let authorizationUrl: string;
  try {
    getEmailProviderConfig(provider);

    const state = createEmailOAuthState({
      org_id: context.orgId,
      location_id: defaultLocation.id,
      provider,
      app_user_id: context.appUserId,
      clerk_user_id: context.clerkUserId,
    });

    authorizationUrl = buildProviderAuthorizationUrl(provider, state);
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          message:
            error instanceof Error ? error.message : "Provider configuration is invalid.",
        },
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    authorization_url: authorizationUrl,
  });
}
