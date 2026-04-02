"use client";

import { useClerk } from "@clerk/nextjs";
import {
  AlertCircle,
  Loader2,
  Users,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import type { SubscriptionPlan } from "@/types/database";

type WorkspaceType = "individual" | "organization";

type PendingInvitation = {
  id: string;
  org_id: string;
  organization_name: string;
  organization_slug: string;
  workspace_type: WorkspaceType;
  email: string;
  role: "admin" | "manager";
  expires_at: string;
  invited_by_label: string | null;
};

type OnboardingStatusResponse =
  | {
      provisioned: true;
      orgId: string;
      role: string;
    }
  | {
      provisioned: false;
      email: string;
      displayName: string;
      suggestedIndividualWorkspaceName: string;
      suggestedOrganizationWorkspaceName: string;
      pendingInvitations: PendingInvitation[];
      highlightedInvitationId: string | null;
      inviteLookupError: string | null;
    };

type PageStatus = "loading" | "provisioning" | "invitations" | "error";

const ROLE_LABEL: Record<PendingInvitation["role"], string> = {
  admin: "Owner",
  manager: "Manager",
};

function formatExpiry(expiresAt: string) {
  return new Date(expiresAt).toLocaleString();
}

export function GettingStartedClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useClerk();
  const [pageStatus, setPageStatus] = useState<PageStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [highlightedInvitationId, setHighlightedInvitationId] = useState<string | null>(null);

  // Guard against double-fire on refresh
  const provisioningRef = useRef(false);

  // ── Auto-provision: fetch status → fetch plan → onboard → Stripe ──

  const autoProvision = useCallback(
    async (suggestedName: string) => {
      if (provisioningRef.current) return;
      provisioningRef.current = true;
      setPageStatus("provisioning");

      try {
        // 1. Fetch active plans and pick based on stored tier preference
        const plansRes = await fetch("/api/billing/plans");
        if (!plansRes.ok) throw new Error("Failed to load plan information.");
        const plansData = await plansRes.json();
        const plans: SubscriptionPlan[] = plansData.plans ?? [];

        let storedTier: string | null = null;
        try {
          storedTier = sessionStorage.getItem("selected_plan_tier");
          sessionStorage.removeItem("selected_plan_tier");
        } catch { /* private browsing */ }

        const plan = storedTier
          ? plans.find((p) => p.tier === storedTier) ?? plans[0]
          : plans[0];

        if (!plan) {
          throw new Error("No active plan found. Please contact support.");
        }

        // 2. Auto-submit onboarding
        const res = await fetch("/api/auth/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceType: plan.workspace_type,
            workspaceName: suggestedName,
            planId: plan.id,
          }),
        });

        const body = (await res.json()) as
          | { provisioned: true; checkoutUrl?: string }
          | { error?: { message?: string } };

        if (!res.ok) {
          const errorBody = body as { error?: { message?: string } };
          throw new Error(errorBody.error?.message ?? "Failed to create workspace.");
        }

        // 3. Redirect to Stripe if checkout URL provided
        if ("checkoutUrl" in body && body.checkoutUrl) {
          sessionStorage.setItem("checkout_pending", "true");
          window.location.href = body.checkoutUrl;
          return;
        }

        // 4. Free plan or no checkout needed — go to dashboard
        await session?.reload();
        router.replace("/invoices");
      } catch (error) {
        provisioningRef.current = false;
        setErrorMessage(
          error instanceof Error ? error.message : "Something went wrong. Please try again."
        );
        setPageStatus("error");
      }
    },
    [router, session]
  );

  const loadStatus = useCallback(async () => {
    try {
      setPageStatus("loading");
      setErrorMessage(null);

      // Handle Stripe checkout return
      const checkoutStatus = searchParams.get("checkout");
      if (checkoutStatus === "success") {
        sessionStorage.removeItem("checkout_pending");
        await session?.reload();
        router.replace("/invoices");
        return;
      }
      if (checkoutStatus === "canceled") {
        sessionStorage.removeItem("checkout_pending");
        await session?.reload();
        router.replace("/invoices");
        return;
      }

      const inviteToken = searchParams.get("invite");
      const url = inviteToken
        ? `/api/auth/status?invite=${encodeURIComponent(inviteToken)}`
        : "/api/auth/status";
      const res = await fetch(url, { method: "GET" });
      const body = (await res.json()) as OnboardingStatusResponse | {
        error?: { message?: string };
      };

      if (!res.ok) {
        const errorBody = body as { error?: { message?: string } };
        throw new Error(
          errorBody.error?.message ?? "Failed to load onboarding state."
        );
      }

      if ("provisioned" in body && body.provisioned) {
        sessionStorage.removeItem("checkout_pending");
        await session?.reload();
        router.replace("/invoices");
        return;
      }

      if (!("provisioned" in body) || body.provisioned) {
        throw new Error("Unexpected onboarding status response.");
      }

      setEmail(body.email);

      // If user has pending invitations, show the invitation UI
      if (body.pendingInvitations.length > 0) {
        setPendingInvitations(body.pendingInvitations);
        setHighlightedInvitationId(body.highlightedInvitationId);
        setErrorMessage(body.inviteLookupError);
        setPageStatus("invitations");
        return;
      }

      // No invitations — auto-provision workspace
      const suggestedName = body.suggestedOrganizationWorkspaceName
        || body.suggestedIndividualWorkspaceName
        || `${body.displayName}'s Organization`;

      void autoProvision(suggestedName);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while loading onboarding."
      );
      setPageStatus("error");
    }
  }, [router, searchParams, session, autoProvision]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  // ── Invitation handlers (unchanged) ──

  const handleClaimInvitation = useCallback(
    async (invitationId: string) => {
      try {
        setPageStatus("loading");
        setErrorMessage(null);

        const res = await fetch("/api/auth/invitations/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invitationId }),
        });

        const body = (await res.json()) as
          | { provisioned: true }
          | { error?: { message?: string } };

        if (!res.ok) {
          const errorBody = body as { error?: { message?: string } };
          throw new Error(errorBody.error?.message ?? "Failed to join workspace.");
        }

        await session?.reload();
        router.replace("/invoices");
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to join workspace."
        );
        setPageStatus("invitations");
      }
    },
    [router, session]
  );

  const handleDeclineInvitation = useCallback(
    async (invitationId: string) => {
      try {
        setPageStatus("loading");
        setErrorMessage(null);

        const res = await fetch("/api/auth/invitations/decline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invitationId }),
        });

        const body = (await res.json()) as
          | { invitation: PendingInvitation }
          | { error?: { message?: string } };

        if (!res.ok) {
          const errorBody = body as { error?: { message?: string } };
          throw new Error(errorBody.error?.message ?? "Failed to decline invitation.");
        }

        setPendingInvitations((prev) =>
          prev.filter((invitation) => invitation.id !== invitationId)
        );
        setHighlightedInvitationId((prev) =>
          prev === invitationId ? null : prev
        );
        setErrorMessage(null);
        setPageStatus("invitations");
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to decline invitation."
        );
        setPageStatus("invitations");
      }
    },
    []
  );

  // ── Render: Loading / Provisioning ──

  if (pageStatus === "loading" || pageStatus === "provisioning") {
    return (
      <div className="flex w-[440px] flex-col items-center gap-4 rounded-xl border border-[var(--border-input)] bg-white p-8 text-center shadow-sm">
        <Loader2 className="size-10 animate-spin text-[var(--primary)]" />
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          {pageStatus === "provisioning" ? "Setting up your workspace" : "Loading your setup"}
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          {pageStatus === "provisioning"
            ? "Preparing your account..."
            : "Checking your workspace status and preparing onboarding."}
        </p>
      </div>
    );
  }

  // ── Render: Error ──

  if (pageStatus === "error") {
    return (
      <div className="flex w-[440px] flex-col items-center gap-4 rounded-xl border border-[var(--border-input)] bg-white p-8 text-center shadow-sm">
        <AlertCircle className="size-10 text-red-500" />
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          Something went wrong
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          {errorMessage ?? "An unexpected error occurred."}
        </p>
        <button
          type="button"
          onClick={() => {
            provisioningRef.current = false;
            void loadStatus();
          }}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-5 py-3 text-sm font-medium text-white transition hover:bg-[var(--primary)]/90"
        >
          Try again
        </button>
      </div>
    );
  }

  // ── Render: Pending Invitations ──

  return (
    <div className="w-full max-w-[780px] rounded-[28px] border border-[var(--border-input)] bg-white/95 p-8 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="mb-8 space-y-2">
        <p className="text-sm font-medium text-[var(--primary)]">
          Pending invitation
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
          Join an organization
        </h1>
        <p className="max-w-2xl text-sm text-[var(--text-secondary)]">
          Signed in as <span className="font-medium text-[var(--text-primary)]">{email}</span>.
          You have pending organization invitations, so we&apos;ll join you to an existing workspace before allowing a personal setup.
        </p>
      </div>

      {errorMessage ? (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      ) : null}

      <div className="space-y-4">
        {pendingInvitations.map((invitation) => {
          const highlighted = invitation.id === highlightedInvitationId;

          return (
            <div
              key={invitation.id}
              className={`rounded-3xl border p-5 transition ${
                highlighted
                  ? "border-[var(--primary)] bg-[var(--primary-05)] shadow-[0_12px_40px_rgba(37,99,235,0.08)]"
                  : "border-[var(--border-input)] bg-white"
              }`}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
                      <Users className="size-5" />
                    </div>
                    <div>
                      <p className="text-base font-semibold text-[var(--text-primary)]">
                        {invitation.organization_name}
                      </p>
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                        {ROLE_LABEL[invitation.role]} invitation
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm text-[var(--text-secondary)]">
                    <p>
                      Invited by{" "}
                      <span className="font-medium text-[var(--text-primary)]">
                        {invitation.invited_by_label ?? "an organization owner"}
                      </span>
                    </p>
                    <p>
                      Expires{" "}
                      <span className="font-medium text-[var(--text-primary)]">
                        {formatExpiry(invitation.expires_at)}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:min-w-[180px]">
                  <button
                    type="button"
                    disabled={pageStatus !== "invitations"}
                    onClick={() => void handleClaimInvitation(invitation.id)}
                    className="inline-flex min-w-[180px] items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-5 py-3 text-sm font-medium text-white transition hover:bg-[var(--primary)]/90 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Join workspace
                  </button>
                  <button
                    type="button"
                    disabled={pageStatus !== "invitations"}
                    onClick={() => void handleDeclineInvitation(invitation.id)}
                    className="inline-flex min-w-[180px] items-center justify-center gap-2 rounded-2xl border border-[var(--border-input)] bg-white px-5 py-3 text-sm font-medium text-[var(--text-primary)] transition hover:border-[var(--primary)]/35 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Decline invite
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
