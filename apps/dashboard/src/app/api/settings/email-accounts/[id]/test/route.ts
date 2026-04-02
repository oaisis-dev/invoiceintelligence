import { NextResponse } from "next/server";
import { assertRole, requireAuthContext } from "@/lib/authz";
import { appendActivityEvent } from "@/lib/activity-events";
import { decryptToken, encryptToken } from "@/lib/crypto";
import {
  fetchMailboxIdentity,
  refreshAccessToken,
  shouldRefreshAccessToken,
  verifyMailboxAccess,
  type EmailProvider,
} from "@/lib/email-providers";
import {
  getDefaultLocationForOrg,
  syncDefaultLocationInboxEmail,
} from "@/lib/default-location";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteParams = { params: Promise<{ id: string }> };

type EmailAccountRow = {
  id: string;
  org_id: string;
  location_id: string | null;
  provider: EmailProvider;
  email_address: string;
  access_token_encrypted: string;
  refresh_token_encrypted: string;
  token_expires_at: string | null;
  is_active: boolean;
  last_verification_status: string;
  last_error: string | null;
  consecutive_failures: number;
  provider_account_id: string | null;
  provider_metadata: Record<string, unknown>;
};

/**
 * POST /api/settings/email-accounts/[id]/test
 * Verifies the current inbox credentials without ingesting any invoices.
 * Admin only.
 */
export async function POST(_request: Request, props: RouteParams) {
  const { id } = await props.params;

  const authResult = await requireAuthContext();
  if (authResult.error) return authResult.error;
  const { context } = authResult;

  const roleError = assertRole(context, ["admin"]);
  if (roleError) return roleError;

  const encryptionKey = process.env.EMAIL_TOKEN_ENCRYPTION_KEY;
  if (!encryptionKey) {
    return NextResponse.json(
      { error: { message: "EMAIL_TOKEN_ENCRYPTION_KEY is not configured" } },
      { status: 500 }
    );
  }

  const adminSupabase = createAdminClient();
  const { data: account, error: accountError } = await adminSupabase
    .from("email_accounts")
    .select(
      "id, org_id, location_id, provider, email_address, access_token_encrypted, refresh_token_encrypted, token_expires_at, is_active, last_verification_status, last_error, consecutive_failures, provider_account_id, provider_metadata"
    )
    .eq("id", id)
    .eq("org_id", context.orgId)
    .maybeSingle<EmailAccountRow>();

  if (accountError) {
    return NextResponse.json(
      { error: { message: `Failed to load inbox: ${accountError.message}` } },
      { status: 500 }
    );
  }

  if (!account) {
    return NextResponse.json(
      { error: { message: "Email account not found" } },
      { status: 404 }
    );
  }

  let accessToken: string;
  let refreshToken: string;
  let tokenExpiresAt = account.token_expires_at;

  try {
    accessToken = decryptToken(account.access_token_encrypted, encryptionKey);
    refreshToken = decryptToken(account.refresh_token_encrypted, encryptionKey);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to decrypt stored tokens.";
    const failedAt = new Date().toISOString();
    await adminSupabase
      .from("email_accounts")
      .update({
        last_verified_at: failedAt,
        last_verification_status: "failed",
        last_verification_error: message,
        updated_at: failedAt,
      })
      .eq("id", id)
      .eq("org_id", context.orgId);

    return NextResponse.json(
      {
        verification: {
          status: "failed",
          message,
          verified_at: failedAt,
        },
      },
      { status: 200 }
    );
  }

  let mailboxIdentity = {
    emailAddress: account.email_address,
    providerAccountId: account.provider_account_id,
    metadata: account.provider_metadata,
  };

  let verificationStatus: "verified" | "failed" = "verified";
  let verificationMessage = "Mailbox access verified successfully.";
  let verifiedAt = new Date().toISOString();

  try {
    if (shouldRefreshAccessToken(tokenExpiresAt)) {
      const refreshedTokens = await refreshAccessToken(account.provider, refreshToken);
      accessToken = refreshedTokens.accessToken;
      refreshToken = refreshedTokens.refreshToken;
      tokenExpiresAt = new Date(
        Date.now() + refreshedTokens.expiresIn * 1000
      ).toISOString();
    }

    mailboxIdentity = await fetchMailboxIdentity(account.provider, accessToken);
    const verificationResult = await verifyMailboxAccess(account.provider, accessToken);
    verificationStatus = verificationResult.status;
    verificationMessage = verificationResult.message;
    verifiedAt = verificationResult.verifiedAt;
  } catch (error) {
    verificationStatus = "failed";
    verificationMessage =
      error instanceof Error ? error.message : "Mailbox verification failed.";
    verifiedAt = new Date().toISOString();
  }

  const shouldActivateAfterTest =
    verificationStatus === "verified" &&
    (account.is_active || account.last_verification_status === "failed");
  const nextIsActive =
    verificationStatus === "verified" ? shouldActivateAfterTest : account.is_active;

  const updates: Record<string, unknown> = {
    access_token_encrypted: encryptToken(accessToken, encryptionKey),
    refresh_token_encrypted: encryptToken(refreshToken, encryptionKey),
    token_expires_at: tokenExpiresAt,
    email_address: mailboxIdentity.emailAddress,
    provider_account_id: mailboxIdentity.providerAccountId,
    provider_metadata: mailboxIdentity.metadata,
    is_active: nextIsActive,
    last_verified_at: verifiedAt,
    last_verification_status: verificationStatus,
    last_verification_error:
      verificationStatus === "failed" ? verificationMessage : null,
    updated_at: verifiedAt,
  };

  if (nextIsActive && !account.is_active) {
    updates.consecutive_failures = 0;
    updates.last_error = null;
  }

  const { data: updatedAccount, error: updateError } = await adminSupabase
    .from("email_accounts")
    .update(updates)
    .eq("id", id)
    .eq("org_id", context.orgId)
    .select(
      "id, org_id, location_id, provider, email_address, token_expires_at, subject_filter, is_active, last_polled_at, last_verified_at, last_verification_status, last_verification_error, last_error, consecutive_failures, disconnected_at, created_at, updated_at, location:locations(id, name, is_default)"
    )
    .single();

  if (updateError) {
    return NextResponse.json(
      { error: { message: `Failed to save verification result: ${updateError.message}` } },
      { status: 500 }
    );
  }

  if (updatedAccount.location_id) {
    try {
      const defaultLocation = await getDefaultLocationForOrg(
        adminSupabase,
        context.orgId
      );
      await syncDefaultLocationInboxEmail(
        adminSupabase,
        defaultLocation.id,
        updatedAccount.is_active ? updatedAccount.email_address : null
      );
    } catch (error) {
      return NextResponse.json(
        {
          error: {
            message:
              error instanceof Error
                ? error.message
                : "Failed to sync default location inbox.",
          },
        },
        { status: 500 }
      );
    }
  }

  await appendActivityEvent({
    eventType: "email.account_tested",
    category: "email",
    severity: "info",
    resourceType: "email_account",
    notificationPolicy: "none",
    payload: {
      provider: account.provider,
      email_address: updatedAccount.email_address,
      result: verificationStatus,
      message: verificationMessage,
      previous_verification_status: account.last_verification_status,
      new_verification_status: updatedAccount.last_verification_status,
      previous_is_active: account.is_active,
      new_is_active: updatedAccount.is_active,
      previous_consecutive_failures: account.consecutive_failures,
      new_consecutive_failures:
        typeof updatedAccount.consecutive_failures === "number"
          ? updatedAccount.consecutive_failures
          : account.consecutive_failures,
      previous_last_error: account.last_error,
      new_last_error:
        typeof updatedAccount.last_error === "string" || updatedAccount.last_error === null
          ? updatedAccount.last_error
          : account.last_error,
    },
  });

  return NextResponse.json({
    verification: {
      status: verificationStatus,
      message: verificationMessage,
      verified_at: verifiedAt,
    },
    account: updatedAccount,
  });
}
