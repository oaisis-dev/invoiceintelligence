import { NextRequest, NextResponse } from "next/server";
import { assertRole, requireAuthContext } from "@/lib/authz";
import { appendActivityEvent } from "@/lib/activity-events";
import {
  getDefaultLocationForOrg,
  syncDefaultLocationInboxEmail,
} from "@/lib/default-location";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * PUT /api/settings/email-accounts/[id]
 * Update email account configuration (subject_filter, location_id, is_active).
 * Admin only. Never touches encrypted tokens.
 */
export async function PUT(request: NextRequest, props: RouteParams) {
  const { id } = await props.params;

  const authResult = await requireAuthContext();
  if (authResult.error) return authResult.error;
  const { context } = authResult;

  const roleError = assertRole(context, ["admin"]);
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

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  // Only allow safe fields to be updated
  const updates: Record<string, unknown> = {};

  if ("subject_filter" in body) {
    if (typeof body.subject_filter !== "string") {
      return NextResponse.json(
        { error: { message: "subject_filter must be a string" } },
        { status: 400 }
      );
    }
    updates.subject_filter = body.subject_filter.trim() || "Invoice Upload";
  }

  if ("is_active" in body) {
    if (typeof body.is_active !== "boolean") {
      return NextResponse.json(
        { error: { message: "is_active must be a boolean" } },
        { status: 400 }
      );
    }
    updates.is_active = body.is_active;
  }

  if ("location_id" in body) {
    const locationId = body.location_id;
    if (locationId !== null && typeof locationId !== "string") {
      return NextResponse.json(
        { error: { message: "location_id must be a string or null" } },
        { status: 400 }
      );
    }
    if (locationId !== null && locationId !== defaultLocation.id) {
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
    updates.location_id = defaultLocation.id;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: { message: "No valid fields to update" } },
      { status: 400 }
    );
  }

  updates.updated_at = new Date().toISOString();

  const { data: currentAccount, error: currentAccountError } = await context.supabase
    .from("email_accounts")
    .select(
      "id, email_address, provider, subject_filter, location_id, is_active, last_verification_status, last_error, consecutive_failures"
    )
    .eq("id", id)
    .eq("org_id", context.orgId)
    .maybeSingle();

  if (currentAccountError) {
    return NextResponse.json(
      { error: { message: `Failed to load inbox: ${currentAccountError.message}` } },
      { status: 500 }
    );
  }

  if (!currentAccount) {
    return NextResponse.json(
      { error: { message: "Email account not found" } },
      { status: 404 }
    );
  }

  if (
    updates.is_active === true &&
    currentAccount.last_verification_status !== "verified"
  ) {
    return NextResponse.json(
      {
        error: {
          message:
            "Inbox is not verified. Send a test email and run Test connection before activating.",
        },
      },
      { status: 400 }
    );
  }

  if (updates.is_active === true) {
    updates.consecutive_failures = 0;
    updates.last_error = null;
  }

  const { data: updated, error: updateError } = await context.supabase
    .from("email_accounts")
    .update(updates)
    .eq("id", id)
    .eq("org_id", context.orgId)
    .select(
      "id, org_id, location_id, provider, email_address, token_expires_at, subject_filter, is_active, last_polled_at, last_error, consecutive_failures, created_at, updated_at"
    )
    .maybeSingle();

  if (updateError) {
    return NextResponse.json(
      { error: { message: `Update failed: ${updateError.message}` } },
      { status: 500 }
    );
  }

  if (!updated) {
    return NextResponse.json(
      { error: { message: "Email account not found" } },
      { status: 404 }
    );
  }

  if ("is_active" in updates || "location_id" in updates) {
    try {
      await syncDefaultLocationInboxEmail(
        context.supabase,
        defaultLocation.id,
        updated.is_active ? ((updated as Record<string, unknown>).email_address as string) : null
      );
    } catch (error) {
      return NextResponse.json(
        {
          error: {
            message:
              error instanceof Error ? error.message : "Failed to sync default location inbox.",
          },
        },
        { status: 500 }
      );
    }
  }

  await appendActivityEvent({
    eventType: "email.account_updated",
    category: "email",
    severity: "info",
    resourceType: "email_account",
    notificationPolicy: "none",
    payload: {
      updated_fields: Object.keys(updates).filter((k) => k !== "updated_at"),
      provider: currentAccount.provider,
      email_address: currentAccount.email_address,
      previous_subject_filter: currentAccount.subject_filter,
      new_subject_filter:
        typeof updates.subject_filter === "string"
          ? updates.subject_filter
          : currentAccount.subject_filter,
      previous_is_active: currentAccount.is_active,
      new_is_active:
        typeof updates.is_active === "boolean"
          ? updates.is_active
          : currentAccount.is_active,
      previous_consecutive_failures: currentAccount.consecutive_failures,
      new_consecutive_failures:
        typeof updates.consecutive_failures === "number"
          ? updates.consecutive_failures
          : currentAccount.consecutive_failures,
      previous_last_error: currentAccount.last_error,
      new_last_error:
        typeof updates.last_error === "string" || updates.last_error === null
          ? updates.last_error
          : currentAccount.last_error,
      previous_location_id: currentAccount.location_id,
      new_location_id:
        typeof updates.location_id === "string"
          ? updates.location_id
          : currentAccount.location_id,
    },
  });

  return NextResponse.json({ account: updated });
}

/**
 * DELETE /api/settings/email-accounts/[id]
 * Disconnect an email account — deletes the row (and its encrypted tokens).
 * Admin only.
 */
export async function DELETE(_request: NextRequest, props: RouteParams) {
  const { id } = await props.params;

  const authResult = await requireAuthContext();
  if (authResult.error) return authResult.error;
  const { context } = authResult;

  const roleError = assertRole(context, ["admin"]);
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

  // Fetch the account first for the audit log
  const { data: account } = await context.supabase
    .from("email_accounts")
    .select("id, email_address, provider, location_id, is_active")
    .eq("id", id)
    .eq("org_id", context.orgId)
    .maybeSingle();

  if (!account) {
    return NextResponse.json(
      { error: { message: "Email account not found" } },
      { status: 404 }
    );
  }

  const { error: deleteError } = await context.supabase
    .from("email_accounts")
    .delete()
    .eq("id", id)
    .eq("org_id", context.orgId);

  if (deleteError) {
    return NextResponse.json(
      { error: { message: `Delete failed: ${deleteError.message}` } },
      { status: 500 }
    );
  }

  if (
    (account as Record<string, unknown>).is_active === true &&
    (account as Record<string, unknown>).location_id === defaultLocation.id
  ) {
    try {
      await syncDefaultLocationInboxEmail(context.supabase, defaultLocation.id, null);
    } catch (error) {
      return NextResponse.json(
        {
          error: {
            message:
              error instanceof Error ? error.message : "Failed to sync default location inbox.",
          },
        },
        { status: 500 }
      );
    }
  }

  await appendActivityEvent({
    eventType: "email.account_disconnected",
    category: "email",
    severity: "info",
    resourceType: "email_account",
    notificationPolicy: "none",
    payload: {
      email_address: (account as Record<string, unknown>).email_address,
      provider: (account as Record<string, unknown>).provider,
    },
  });

  return new NextResponse(null, { status: 204 });
}
