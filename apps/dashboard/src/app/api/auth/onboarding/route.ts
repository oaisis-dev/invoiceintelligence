import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { appendActivityEventAdmin } from "@/lib/activity-events";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildDisplayName,
  configureProvisionedWorkspace,
  getIdentityColumnFromEnv,
  linkExistingUserIdentity,
  normalizeWorkspaceName,
  provisionNewAccount,
} from "@/lib/provisioning";
import { listPendingInvitationsForEmail } from "@/lib/organization-members";
import { getBillingService, getPlanById } from "@/lib/billing/config";
import type { SubscriptionPlan, WorkspaceType } from "@/types/database";

type OnboardingPayload = {
  workspaceType?: WorkspaceType;
  workspaceName?: string;
  planId?: string;
};

function badRequest(message: string) {
  return NextResponse.json(
    { error: { code: "INVALID_ONBOARDING_PAYLOAD", message } },
    { status: 400 }
  );
}

async function resolveCheckoutPriceId(
  supabase: ReturnType<typeof createAdminClient>,
  plan: SubscriptionPlan
): Promise<string | null> {
  // Check if promo pricing is available
  if (plan.promo_max_slots && plan.promo_payment_price_id) {
    const { count } = await supabase
      .from("organizations")
      .select("id", { count: "exact", head: true })
      .eq("plan_id", plan.id)
      .not("payment_subscription_id", "is", null);

    if ((count ?? 0) < plan.promo_max_slots) {
      return plan.promo_payment_price_id;
    }
  }

  return plan.payment_price_id;
}

async function createCheckoutForPaidPlan(
  supabase: ReturnType<typeof createAdminClient>,
  orgId: string,
  plan: SubscriptionPlan,
  appUrl: string
): Promise<string | null> {
  if (!plan.payment_price_id || plan.price_cents === 0) return null;

  const priceId = await resolveCheckoutPriceId(supabase, plan);
  if (!priceId) return null;

  const billingService = getBillingService();
  const { url } = await billingService.createCheckout(
    supabase,
    orgId,
    priceId,
    `${appUrl}/getting-started?checkout=success`,
    `${appUrl}/getting-started?checkout=canceled`,
    { org_id: orgId, plan_id: plan.id }
  );
  return url;
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
      { status: 401 }
    );
  }

  let body: OnboardingPayload;
  try {
    body = (await request.json()) as OnboardingPayload;
  } catch {
    return badRequest("Invalid JSON body.");
  }

  const workspaceType = body.workspaceType;
  const workspaceName = typeof body.workspaceName === "string"
    ? normalizeWorkspaceName(body.workspaceName)
    : "";
  const rawPlanId = typeof body.planId === "string" ? body.planId.trim() : undefined;

  if (workspaceType !== "individual" && workspaceType !== "organization") {
    return badRequest("workspaceType must be 'individual' or 'organization'.");
  }

  if (workspaceName.length < 2) {
    return badRequest("Workspace name must be at least 2 characters long.");
  }

  if (workspaceName.length > 80) {
    return badRequest("Workspace name must be 80 characters or fewer.");
  }

  const supabase = createAdminClient();

  // Resolve selected plan (if provided)
  let selectedPlan: SubscriptionPlan | null = null;
  if (rawPlanId) {
    selectedPlan = await getPlanById(supabase, rawPlanId);
    if (!selectedPlan || !selectedPlan.is_active) {
      selectedPlan = null; // fall back to free plan
    } else if (selectedPlan.workspace_type !== workspaceType) {
      return badRequest("Selected plan does not match workspace type.");
    } else if (selectedPlan.tier === "enterprise") {
      return badRequest("Enterprise plans require contacting sales.");
    }
  }

  const isPaidPlan = selectedPlan !== null && selectedPlan.price_cents > 0 && !!selectedPlan.payment_price_id;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  const { data: existingUser, error: lookupError } = await supabase
    .from("users")
    .select("id, org_id, role, is_active")
    .or(
      `external_id.eq.${userId},clerk_dev_id.eq.${userId},clerk_prod_id.eq.${userId}`
    )
    .maybeSingle();

  if (lookupError) {
    return NextResponse.json(
      { error: { code: "LOOKUP_FAILED", message: lookupError.message } },
      { status: 500 }
    );
  }

  const clerk = await clerkClient();

  if (existingUser?.is_active) {
    try {
      await configureProvisionedWorkspace(supabase, {
        orgId: existingUser.org_id,
        workspaceName,
        workspaceType,
        planId: !isPaidPlan ? selectedPlan?.id : undefined,
      });
    } catch (error) {
      return NextResponse.json(
        {
          error: {
            code: "WORKSPACE_CONFIG_FAILED",
            message:
              error instanceof Error ? error.message : "Failed to configure workspace.",
          },
        },
        { status: 500 }
      );
    }

    await clerk.users.updateUserMetadata(userId, {
      publicMetadata: { org_id: existingUser.org_id },
    });

    await appendActivityEventAdmin({
      orgId: existingUser.org_id as string,
      actorUserId: existingUser.id as string,
      eventType: "system.onboarding_completed",
      category: "system",
      severity: "info",
      notificationPolicy: "none",
      payload: {
        workspace_name: workspaceName,
        workspace_type: workspaceType,
        selected_plan_id: selectedPlan?.id ?? null,
        source: "getting_started",
        completion_mode: "existing_workspace",
      },
    });

    // For paid plans, create a Stripe Checkout session
    let checkoutUrl: string | null = null;
    if (isPaidPlan && selectedPlan) {
      checkoutUrl = await createCheckoutForPaidPlan(
        supabase,
        existingUser.org_id as string,
        selectedPlan,
        appUrl
      );
    }

    return NextResponse.json({
      provisioned: true,
      orgId: existingUser.org_id,
      role: existingUser.role,
      ...(checkoutUrl ? { checkoutUrl } : {}),
    });
  }
  const clerkUser = await clerk.users.getUser(userId);
  const primaryEmail = clerkUser.emailAddresses?.[0]?.emailAddress;

  if (!primaryEmail) {
    return NextResponse.json(
      { error: { code: "NO_EMAIL", message: "No email address on Clerk user" } },
      { status: 400 }
    );
  }

  const displayName = buildDisplayName(
    primaryEmail,
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ")
  );
  const identityColumn = getIdentityColumnFromEnv();

  const linkedUser = await linkExistingUserIdentity(supabase, {
    email: primaryEmail,
    displayName,
    clerkUserId: userId,
    identityColumn,
  });

  if (linkedUser?.error) {
    return NextResponse.json(
      { error: { code: "LINK_FAILED", message: linkedUser.error } },
      { status: 500 }
    );
  }

  if (linkedUser?.orgId && linkedUser.role) {
    await clerk.users.updateUserMetadata(userId, {
      publicMetadata: { org_id: linkedUser.orgId },
    });

    await appendActivityEventAdmin({
      orgId: linkedUser.orgId,
      actorUserId: linkedUser.userId,
      eventType: "system.onboarding_completed",
      category: "system",
      severity: "info",
      notificationPolicy: "none",
      payload: {
        workspace_name: null,
        workspace_type: null,
        source: "getting_started",
        completion_mode: "linked_workspace",
      },
    });

    return NextResponse.json({
      provisioned: true,
      orgId: linkedUser.orgId,
      role: linkedUser.role,
    });
  }

  const pendingInvitations = await listPendingInvitationsForEmail(
    supabase,
    primaryEmail
  );
  if (pendingInvitations.length > 0) {
    return NextResponse.json(
      {
        error: {
          code: "INVITE_PENDING_JOIN_REQUIRED",
          message:
            "You have a pending organization invitation. Join that organization before creating a new workspace.",
        },
      },
      { status: 409 }
    );
  }

  const result = await provisionNewAccount(supabase, {
    email: primaryEmail,
    displayName,
    clerkUserId: userId,
    identityColumn,
  });

  if (result.error || !result.orgId) {
    return NextResponse.json(
      {
        error: {
          code: "PROVISION_FAILED",
          message: result.error ?? "Workspace provisioning returned no organization id.",
        },
      },
      { status: 500 }
    );
  }

  try {
    await configureProvisionedWorkspace(supabase, {
      orgId: result.orgId,
      workspaceName,
      workspaceType,
      planId: !isPaidPlan ? selectedPlan?.id : undefined,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "WORKSPACE_CONFIG_FAILED",
          message:
            error instanceof Error ? error.message : "Failed to configure workspace.",
        },
      },
      { status: 500 }
    );
  }

  await clerk.users.updateUserMetadata(userId, {
    publicMetadata: { org_id: result.orgId },
  });

  await appendActivityEventAdmin({
    orgId: result.orgId,
    actorUserId: result.userId,
    eventType: "system.workspace_created",
    category: "system",
    severity: "info",
    notificationPolicy: "none",
    payload: {
      workspace_name: workspaceName,
      workspace_type: workspaceType,
      selected_plan_id: selectedPlan?.id ?? null,
      source: "getting_started",
      default_location_id: result.locationId,
    },
  });

  await appendActivityEventAdmin({
    orgId: null,
    actorUserId: result.userId,
    eventType: "platform.org_created",
    category: "platform",
    severity: "info",
    resourceType: "organization",
    resourceId: result.orgId,
    notificationPolicy: "platform_admins",
    payload: {
      org_name: workspaceName,
      user_email: primaryEmail,
      workspace_type: workspaceType,
      org_id: result.orgId,
    },
  });

  await appendActivityEventAdmin({
    orgId: result.orgId,
    actorUserId: result.userId,
    eventType: "system.onboarding_completed",
    category: "system",
    severity: "info",
    notificationPolicy: "none",
    payload: {
      workspace_name: workspaceName,
      workspace_type: workspaceType,
      selected_plan_id: selectedPlan?.id ?? null,
      source: "getting_started",
      completion_mode: "new_workspace",
    },
  });

  // For paid plans, create a Stripe Checkout session
  let checkoutUrl: string | null = null;
  if (isPaidPlan && selectedPlan) {
    checkoutUrl = await createCheckoutForPaidPlan(
      supabase,
      result.orgId,
      selectedPlan,
      appUrl
    );
  }

  return NextResponse.json({
    provisioned: true,
    orgId: result.orgId,
    role: "admin",
    ...(checkoutUrl ? { checkoutUrl } : {}),
  });
}



