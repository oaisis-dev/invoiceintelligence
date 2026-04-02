import { NextRequest, NextResponse } from "next/server";
import { assertRole, requireAuthContext } from "@/lib/authz";
import { appendActivityEvent } from "@/lib/activity-events";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptToken } from "@/lib/crypto";
import {
  getDefaultLocationForOrg,
  syncDefaultLocationInboxEmail,
} from "@/lib/default-location";
import {
  exchangeAuthorizationCode,
  fetchMailboxIdentity,
  parseEmailOAuthState,
  verifyMailboxAccess,
} from "@/lib/email-providers";

/**
 * GET /api/settings/email-accounts/callback?code=...&state=...
 * OAuth providers redirect here after user consent. Exchanges the auth code
 * for tokens, encrypts them, and stores in email_accounts.
 * Redirects the user back to the settings page with a result param.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const errorParam = searchParams.get("error");

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_URL ||
    request.url;
  const settingsUrl = new URL("/settings/email-accounts", baseUrl);

  // User denied consent
  if (errorParam) {
    settingsUrl.searchParams.set("error", errorParam);
    return NextResponse.redirect(settingsUrl);
  }

  if (!code) {
    settingsUrl.searchParams.set("error", "missing_code");
    return NextResponse.redirect(settingsUrl);
  }

  const state = parseEmailOAuthState(stateParam);
  if (!state) {
    settingsUrl.searchParams.set("error", "invalid_state");
    return NextResponse.redirect(settingsUrl);
  }

  const authResult = await requireAuthContext();
  if (authResult.error) {
    settingsUrl.searchParams.set("error", "session_required");
    return NextResponse.redirect(settingsUrl);
  }
  const { context } = authResult;

  const roleError = assertRole(context, ["admin"]);
  if (roleError) {
    settingsUrl.searchParams.set("error", "session_mismatch");
    return NextResponse.redirect(settingsUrl);
  }

  if (
    state.org_id !== context.orgId ||
    state.app_user_id !== context.appUserId ||
    state.clerk_user_id !== context.clerkUserId
  ) {
    settingsUrl.searchParams.set("error", "session_mismatch");
    return NextResponse.redirect(settingsUrl);
  }

  let tokenData;
  try {
    tokenData = await exchangeAuthorizationCode(state.provider, code);
  } catch (error) {
    console.error("Email token exchange failed:", error);
    settingsUrl.searchParams.set("error", "token_exchange_failed");
    return NextResponse.redirect(settingsUrl);
  }

  if (!tokenData.refreshToken) {
    settingsUrl.searchParams.set("error", "no_refresh_token");
    return NextResponse.redirect(settingsUrl);
  }

  let mailboxIdentity;
  try {
    mailboxIdentity = await fetchMailboxIdentity(
      state.provider,
      tokenData.accessToken
    );
  } catch (error) {
    console.error("Email mailbox identity lookup failed:", error);
    settingsUrl.searchParams.set("error", "userinfo_failed");
    return NextResponse.redirect(settingsUrl);
  }

  // --- Encrypt tokens ---
  const encryptionKey = process.env.EMAIL_TOKEN_ENCRYPTION_KEY;
  if (!encryptionKey) {
    settingsUrl.searchParams.set("error", "server_config");
    return NextResponse.redirect(settingsUrl);
  }

  const accessTokenEncrypted = encryptToken(
    tokenData.accessToken,
    encryptionKey
  );
  const refreshTokenEncrypted = encryptToken(
    tokenData.refreshToken,
    encryptionKey
  );

  const tokenExpiresAt = new Date(
    Date.now() + tokenData.expiresIn * 1000
  ).toISOString();

  // --- Upsert into email_accounts ---
  const adminSupabase = createAdminClient();

  let defaultLocation;
  try {
    defaultLocation = await getDefaultLocationForOrg(adminSupabase, state.org_id);
  } catch (error) {
    console.error("Failed to load default location:", error);
    settingsUrl.searchParams.set("error", "default_location_missing");
    return NextResponse.redirect(settingsUrl);
  }

  if (state.location_id && state.location_id !== defaultLocation.id) {
    settingsUrl.searchParams.set("error", "invalid_location_scope");
    return NextResponse.redirect(settingsUrl);
  }

  const { data: existingAccount, error: existingAccountError } = await adminSupabase
    .from("email_accounts")
    .select("id, email_address, is_active")
    .eq("org_id", state.org_id)
    .order("is_active", { ascending: false })
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingAccountError) {
    console.error("Failed to inspect current inbox:", existingAccountError);
    settingsUrl.searchParams.set("error", "save_failed");
    return NextResponse.redirect(settingsUrl);
  }

  if (
    existingAccount &&
    existingAccount.email_address !== mailboxIdentity.emailAddress
  ) {
    settingsUrl.searchParams.set("error", "active_inbox_exists");
    settingsUrl.searchParams.set("existing_email", existingAccount.email_address);
    return NextResponse.redirect(settingsUrl);
  }

  let verificationStatus: "verified" | "failed" = "verified";
  let verificationMessage: string | null = null;
  let verifiedAt: string | null = null;

  try {
    const verificationResult = await verifyMailboxAccess(
      state.provider,
      tokenData.accessToken
    );
    verificationStatus = verificationResult.status;
    verificationMessage =
      verificationResult.status === "verified" ? null : verificationResult.message;
    verifiedAt = verificationResult.verifiedAt;
  } catch (error) {
    console.error("Mailbox verification failed:", error);
    verificationStatus = "failed";
    verificationMessage =
      error instanceof Error ? error.message : "Mailbox verification failed.";
    verifiedAt = new Date().toISOString();
  }

  const { data: savedAccount, error: upsertError } = await adminSupabase
    .from("email_accounts")
    .upsert(
      {
        org_id: state.org_id,
        location_id: defaultLocation.id,
        provider: state.provider,
        email_address: mailboxIdentity.emailAddress,
        access_token_encrypted: accessTokenEncrypted,
        refresh_token_encrypted: refreshTokenEncrypted,
        token_expires_at: tokenExpiresAt,
        is_active: verificationStatus === "verified",
        last_error: null,
        consecutive_failures: 0,
        last_verified_at: verifiedAt,
        last_verification_status: verificationStatus,
        last_verification_error: verificationMessage,
        provider_account_id: mailboxIdentity.providerAccountId,
        provider_metadata: mailboxIdentity.metadata,
      },
      { onConflict: "org_id,email_address" }
    )
    .select("id, email_address, provider, last_verification_status, last_verification_error")
    .single();

  if (upsertError) {
    console.error("Failed to save email account:", upsertError);
    if (upsertError.code === "23505") {
      settingsUrl.searchParams.set("error", "active_inbox_exists");
      return NextResponse.redirect(settingsUrl);
    }
    settingsUrl.searchParams.set("error", "save_failed");
    return NextResponse.redirect(settingsUrl);
  }

  if (!savedAccount) {
    settingsUrl.searchParams.set("error", "save_failed");
    return NextResponse.redirect(settingsUrl);
  }

  try {
    await syncDefaultLocationInboxEmail(
      adminSupabase,
      defaultLocation.id,
      verificationStatus === "verified" ? mailboxIdentity.emailAddress : null
    );
  } catch (error) {
    console.error("Failed to sync default location inbox:", error);
    settingsUrl.searchParams.set("error", "save_failed");
    return NextResponse.redirect(settingsUrl);
  }

  await appendActivityEvent({
    eventType: "email.account_connected",
    category: "email",
    severity: "info",
    resourceType: "email_account",
    notificationPolicy: "none",
    payload: {
      provider: savedAccount.provider,
      email_address: savedAccount.email_address,
      verification_status: savedAccount.last_verification_status,
      verification_error: savedAccount.last_verification_error,
    },
  });

  settingsUrl.searchParams.set("success", "connected");
  settingsUrl.searchParams.set("email", mailboxIdentity.emailAddress);
  if (verificationStatus === "failed") {
    settingsUrl.searchParams.set("verification", "failed");
  }
  return NextResponse.redirect(settingsUrl);
}
