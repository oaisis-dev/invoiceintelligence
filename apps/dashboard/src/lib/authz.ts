import { auth } from "@clerk/nextjs/server";
import { type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

export type AuthContext = {
  clerkUserId: string;
  appUserId: string;
  orgId: string;
  role: UserRole;
  locationId: string | null;
  supabase: SupabaseClient;
};

type AuthResult =
  | { context: AuthContext; error: null }
  | { context: null; error: NextResponse };

export function unauthorizedResponse() {
  return NextResponse.json(
    { error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
    { status: 401 }
  );
}

export function accessNotProvisionedResponse() {
  return NextResponse.json(
    {
      error: {
        code: "ACCESS_NOT_PROVISIONED",
        message:
          "Your account is not provisioned for Invoice Intelligence yet. Please contact an admin.",
      },
    },
    { status: 403 }
  );
}

export function forbiddenResponse(
  code: string,
  message = "Forbidden"
) {
  return NextResponse.json(
    { error: { code, message } },
    { status: 403 }
  );
}

export async function requireAuthContext(): Promise<AuthResult> {
  const { userId } = await auth();
  if (!userId) {
    return { context: null, error: unauthorizedResponse() };
  }

  const supabase = await createServerClient();
  const { data: appUser, error: appUserError } = await supabase
    .from("users")
    .select("id, org_id, role, location_id, is_active")
    .or(
      `external_id.eq.${userId},clerk_dev_id.eq.${userId},clerk_prod_id.eq.${userId}`
    )
    .maybeSingle();

  if (appUserError) {
    return {
      context: null,
      error: NextResponse.json(
        {
          error: {
            code: "AUTH_CONTEXT_LOAD_FAILED",
            message: `Failed to load user context: ${appUserError.message}`,
          },
        },
        { status: 500 }
      ),
    };
  }

  if (!appUser || !appUser.is_active) {
    return { context: null, error: accessNotProvisionedResponse() };
  }

  return {
    context: {
      clerkUserId: userId,
      appUserId: appUser.id as string,
      orgId: appUser.org_id as string,
      role: appUser.role as UserRole,
      locationId: (appUser.location_id as string | null) ?? null,
      supabase,
    },
    error: null,
  };
}

export function isAdmin(context: AuthContext) {
  return context.role === "admin";
}

export function isManager(context: AuthContext) {
  return context.role === "manager";
}

export function canManageInvoiceActions(context: AuthContext) {
  return isAdmin(context) || isManager(context);
}

export function assertRole(
  context: AuthContext,
  allowedRoles: UserRole[],
  errorCode = "FORBIDDEN_ROLE"
) {
  if (allowedRoles.includes(context.role)) {
    return null;
  }
  return forbiddenResponse(
    errorCode,
    `Role "${context.role}" is not allowed for this operation.`
  );
}

export function assertLocationAccess(
  context: AuthContext,
  targetLocationId: string | null
) {
  if (isAdmin(context) || isManager(context)) {
    return null;
  }
  if (!context.locationId) {
    return forbiddenResponse(
      "LOCATION_SCOPE_REQUIRED",
      "Your account is missing a location assignment."
    );
  }
  if (!targetLocationId || targetLocationId !== context.locationId) {
    return forbiddenResponse(
      "LOCATION_SCOPE_VIOLATION",
      "You are not allowed to access another location."
    );
  }
  return null;
}
