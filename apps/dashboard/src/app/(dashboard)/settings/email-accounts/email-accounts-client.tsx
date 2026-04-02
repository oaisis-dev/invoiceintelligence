"use client";

import { useCallback, useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  Plus,
  Power,
  PowerOff,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  connectEmailAccount,
  createAllowedSender,
  deleteAllowedSender,
  deleteEmailAccount,
  getEmailAccounts,
  testEmailAccount,
  updateEmailAccount,
  updateSenderRecommendation,
  type EmailAccountPayload,
} from "@/lib/api-client";
import {
  EMAIL_PROVIDER_META,
  EMAIL_PROVIDER_OPTIONS,
  isEmailAccountProvider,
} from "@/lib/email-provider-catalog";
import type { EmailAccountProvider, UserRole } from "@/types/database";

type EmailAccountRow = EmailAccountPayload["accounts"][0];
type SenderPolicy = EmailAccountPayload["sender_policy"];
type SenderRecommendation = EmailAccountPayload["recommendations"][0];

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  access_denied: "You denied access to the email account.",
  missing_code: "OAuth callback was missing the authorization code.",
  invalid_state: "OAuth state parameter was invalid.",
  session_required: "Sign in again before finishing the inbox connection.",
  session_mismatch:
    "This inbox connection belongs to a different session. Start the connection again from settings.",
  invalid_location_scope:
    "The inbox must remain attached to the workspace default location.",
  token_exchange_failed: "Failed to exchange the authorization code.",
  no_refresh_token:
    "The provider did not return a refresh token. Try disconnecting and reconnecting.",
  userinfo_failed: "Failed to retrieve the mailbox identity from the provider.",
  server_config: "Server is missing OAuth configuration.",
  default_location_missing:
    "This workspace is missing a default location. Please contact support.",
  active_inbox_exists:
    "Only one inbox can be active at a time. Disconnect the current inbox before connecting another.",
  save_failed: "Failed to save the email account.",
};

const EMPTY_POLICY: SenderPolicy = {
  mode: "discovery",
  effective_scope: "none",
  discovery_keywords: [],
  default_location: { id: "", name: "Default location" },
  org_allowed_senders: [],
  location_allowed_senders: [],
};

function isValidEmailAddress(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function pendingRecommendations(recommendations: SenderRecommendation[]) {
  return recommendations.filter((recommendation) => recommendation.status === "pending");
}

export function EmailAccountsClient({ role }: { role: UserRole | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<EmailAccountPayload["accounts"]>([]);
  const [senderPolicy, setSenderPolicy] = useState<SenderPolicy>(EMPTY_POLICY);
  const [recommendations, setRecommendations] = useState<EmailAccountPayload["recommendations"]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  const isOwner = role === "admin";
  const primaryAccount = accounts.find((account) => account.is_active) ?? accounts[0] ?? null;
  const historicalCount = primaryAccount ? Math.max(accounts.length - 1, 0) : 0;
  const visibleRecommendations = useMemo(
    () => pendingRecommendations(recommendations),
    [recommendations]
  );

  const loadInboxSettings = useCallback(async () => {
    try {
      const data = await getEmailAccounts();
      setAccounts(data.accounts);
      setSenderPolicy(data.sender_policy);
      setRecommendations(data.recommendations);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load email inbox status."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    const email = searchParams.get("email");
    const verification = searchParams.get("verification");

    if (success === "connected" && email) {
      toast[verification === "failed" ? "warning" : "success"](
        verification === "failed"
          ? `Connected ${email}, but the first verification failed.`
          : `Connected ${email}`
      );
      router.replace("/settings/email-accounts");
      return;
    }

    if (error) {
      toast.error(OAUTH_ERROR_MESSAGES[error] || `OAuth error: ${error}`);
      router.replace("/settings/email-accounts");
    }
  }, [router, searchParams]);

  useEffect(() => {
    void loadInboxSettings();
  }, [loadInboxSettings]);

  const handleConnect = useCallback(async (provider: EmailAccountProvider) => {
    setConnecting(true);
    try {
      const { authorization_url } = await connectEmailAccount(provider);
      window.location.href = authorization_url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start OAuth flow.");
      setConnecting(false);
    }
  }, []);

  if (loading) {
    return (
      <GlassCard className="p-[25px]">
        <div className="flex items-center justify-center py-12 text-[var(--text-secondary)]">
          <Loader2 className="mr-2 size-5 animate-spin" />
          Loading inbox settings...
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6">
      <GlassCard className="p-[25px]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] tracking-tight">
                Workspace inbox
              </h2>
              <Badge variant="outline" className="text-[10px] uppercase tracking-[0.14em]">
                One inbox per workspace
              </Badge>
            </div>
            <p className="max-w-2xl text-sm text-[var(--text-secondary)]">
              Connect a dedicated billing inbox to monitor and process approved invoice senders automatically.
            </p>
          </div>
          {!isOwner ? (
            <div className="flex items-start gap-2 rounded-[var(--radius-md)] border border-[var(--border-input)] bg-white/60 px-3 py-2 text-sm text-[var(--text-secondary)]">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
              <span>Managers can monitor inbox health and sender policy here. Only owners can change it.</span>
            </div>
          ) : null}
        </div>
      </GlassCard>

      {primaryAccount ? (
        <InboxCard
          account={primaryAccount}
          historicalCount={historicalCount}
          isOwner={isOwner}
          senderPolicy={senderPolicy}
          onUpdated={loadInboxSettings}
        />
      ) : (
        <EmptyInboxState isOwner={isOwner} connecting={connecting} onConnect={handleConnect} />
      )}

      <SenderGovernanceCard
        isOwner={isOwner}
        senderPolicy={senderPolicy}
        recommendations={visibleRecommendations}
        hasConnectedInbox={Boolean(primaryAccount)}
        onUpdated={loadInboxSettings}
      />
    </div>
  );
}

function EmptyInboxState({
  isOwner,
  connecting,
  onConnect,
}: {
  isOwner: boolean;
  connecting: boolean;
  onConnect: (provider: EmailAccountProvider) => void;
}) {
  return (
    <GlassCard className="p-[25px]">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <div className="flex size-12 items-center justify-center rounded-full bg-[var(--bg-secondary)]">
            <Mail className="size-6 text-[var(--text-secondary)]" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">No inbox connected yet</h3>
            <p className="max-w-xl text-sm text-[var(--text-secondary)]">
              Connect a dedicated billing inbox to monitor candidate invoice senders and
              later process approved senders automatically.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {isOwner ? (
            EMAIL_PROVIDER_OPTIONS.map((provider, index) => (
              <Button
                key={provider.provider}
                variant={index === 0 ? "default" : "outline"}
                onClick={() => onConnect(provider.provider)}
                disabled={connecting}
                className={
                  index === 0
                    ? "h-10 px-4 rounded-[var(--radius-sm)] bg-[var(--primary)] text-white font-medium text-sm cursor-pointer hover:bg-[var(--primary)]/90"
                    : "h-10 px-4 text-sm border-[var(--border-input)] text-[var(--text-secondary)] cursor-pointer"
                }
              >
                {connecting && index === 0 ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
                {connecting ? "Redirecting..." : provider.connectLabel}
              </Button>
            ))
          ) : (
            <div className="rounded-[var(--radius-md)] border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Ask an owner to connect the workspace inbox before email uploads can begin.
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

function InboxCard({
  account,
  historicalCount,
  isOwner,
  senderPolicy,
  onUpdated,
}: {
  account: EmailAccountRow;
  historicalCount: number;
  isOwner: boolean;
  senderPolicy: SenderPolicy;
  onUpdated: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const providerMeta = isEmailAccountProvider(account.provider)
    ? EMAIL_PROVIDER_META[account.provider]
    : { label: account.provider, connectLabel: `Connect ${account.provider}`, badgeClassName: "bg-gray-100 text-gray-700" };

  const handleToggleActive = useCallback(() => {
    const nextActionLabel = isWorkerDisabled(account) ? "re-enabled" : "resumed";
    startTransition(async () => {
      try {
        await updateEmailAccount(account.id, { is_active: !account.is_active });
        toast.success(account.is_active ? "Inbox paused." : `Inbox ${nextActionLabel}.`);
        onUpdated();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update inbox status.");
      }
    });
  }, [account, onUpdated]);

  const handleDisconnect = useCallback(() => {
    startTransition(async () => {
      try {
        await deleteEmailAccount(account.id);
        toast.success(`Disconnected ${account.email_address}.`);
        onUpdated();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to disconnect inbox.");
      }
    });
  }, [account.email_address, account.id, onUpdated]);

  const handleTestConnection = useCallback(() => {
    startTransition(async () => {
      try {
        const result = await testEmailAccount(account.id);
        toast[result.verification.status === "verified" ? "success" : "error"](
          result.verification.message
        );
        onUpdated();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to verify inbox access.");
      }
    });
  }, [account.id, onUpdated]);

  return (
    <GlassCard className="p-[25px]">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--bg-secondary)]">
              <Mail className="size-5 text-[var(--text-secondary)]" />
            </div>
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-lg font-semibold text-[var(--text-primary)]">{account.email_address}</p>
                <Badge className={`text-[10px] ${providerMeta.badgeClassName}`}>{providerMeta.label}</Badge>
                <ConnectionStatusBadge account={account} />
                <VerificationStatusBadge account={account} />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {isOwner ? (
              <>
                <Button variant="outline" size="sm" onClick={handleTestConnection} disabled={isPending} className="h-9 px-3 text-xs cursor-pointer">
                  <ShieldCheck className="size-3.5" />
                  Test connection
                </Button>
                <Button variant="outline" size="sm" onClick={handleToggleActive} disabled={isPending} className="h-9 px-3 text-xs cursor-pointer">
                  {account.is_active ? <PowerOff className="size-3.5" /> : <Power className="size-3.5" />}
                  {account.is_active ? "Pause" : isWorkerDisabled(account) ? "Re-enable" : "Resume"}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" disabled={isPending} className="h-9 px-3 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 cursor-pointer">
                      <Trash2 className="size-3.5" />
                      Disconnect
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Disconnect workspace inbox?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This stops invoice polling for <span className="font-medium">{account.email_address}</span> and removes the stored OAuth tokens.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDisconnect} className="bg-red-600 hover:bg-red-700 cursor-pointer">
                        Disconnect
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            ) : (
              <div className="rounded-[var(--radius-md)] border border-[var(--border-input)] bg-white/60 px-3 py-2 text-sm text-[var(--text-secondary)]">
                Owner-only actions
              </div>
            )}
          </div>
        </div>

        <StageBanner senderPolicy={senderPolicy} />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoField label="Sender policy">
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {senderPolicy.mode === "discovery"
                ? "Monitoring candidate invoice senders"
                : "Processing approved senders"}
            </p>
          </InfoField>
          <InfoField label="Last verified"><p className="text-sm font-medium text-[var(--text-primary)]">{formatTimestamp(account.last_verified_at)}</p></InfoField>
          <InfoField label="Last successful poll"><p className="text-sm font-medium text-[var(--text-primary)]">{formatTimestamp(account.last_polled_at)}</p></InfoField>
          <InfoField label="Health"><p className="text-sm font-medium text-[var(--text-primary)]">{describeHealth(account)}</p></InfoField>
        </div>

        {historicalCount > 0 ? (
          <div className="rounded-[var(--radius-md)] border border-[var(--border-input)] bg-white/60 px-3 py-2 text-sm text-[var(--text-secondary)]">
            {historicalCount} historical inbox{historicalCount === 1 ? "" : "es"} exist for this workspace, but only the current inbox is shown here.
          </div>
        ) : null}

        {account.last_verification_error ? (
          <MessageBanner tone="warning" icon={<ShieldAlert className="size-4 shrink-0" />} message={account.last_verification_error} />
        ) : null}
        {account.last_error ? (
          <MessageBanner tone="danger" icon={<AlertCircle className="size-4 shrink-0" />} message={account.last_error} />
        ) : null}
      </div>
    </GlassCard>
  );
}

function SenderGovernanceCard({
  isOwner,
  senderPolicy,
  recommendations,
  hasConnectedInbox,
  onUpdated,
}: {
  isOwner: boolean;
  senderPolicy: SenderPolicy;
  recommendations: SenderRecommendation[];
  hasConnectedInbox: boolean;
  onUpdated: () => void;
}) {
  return (
    <GlassCard className="p-[25px]">
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] tracking-tight">Approved senders</h3>
            <Badge variant="outline" className="text-[10px] uppercase tracking-[0.14em]">Email settings is canonical</Badge>
          </div>
          <p className="max-w-3xl text-sm text-[var(--text-secondary)]">
            If both lists are empty, the inbox stays in discovery mode and only recommends candidate senders for owner approval.
          </p>
        </div>

        <AllowedSenderList
          title="Allowed senders"
          description="Only emails from approved senders will be processed."
          emptyMessage="No approved senders yet."
          scope="location"
          isOwner={isOwner}
          senders={deduplicateSenders([...senderPolicy.org_allowed_senders, ...senderPolicy.location_allowed_senders])}
          onUpdated={onUpdated}
        />

        <div className="space-y-3 rounded-[var(--radius-md)] border border-[var(--border-input)] bg-white/70 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">Candidate senders</h4>
              <p className="text-sm text-[var(--text-secondary)]">
                {hasConnectedInbox
                  ? "Matching invoice-subject emails from unapproved senders stay unread and show up here for review."
                  : "Recommendations will appear here after you connect an inbox and discovery mode finds candidate invoice emails."}
              </p>
            </div>
            <Badge variant="outline" className="text-[10px] uppercase tracking-[0.14em]">{recommendations.length} pending</Badge>
          </div>
          {recommendations.length === 0 ? (
            <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--border-input)] bg-white/70 p-4 text-sm text-[var(--text-secondary)]">
              No candidate senders are waiting for review right now.
            </div>
          ) : (
            <div className="space-y-3">
              {recommendations.map((recommendation) => (
                <RecommendationRow key={recommendation.id} recommendation={recommendation} isOwner={isOwner} onUpdated={onUpdated} />
              ))}
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

function AllowedSenderList({
  title,
  description,
  emptyMessage,
  scope,
  isOwner,
  senders,
  onUpdated,
}: {
  title: string;
  description: string;
  emptyMessage: string;
  scope: "org" | "location";
  isOwner: boolean;
  senders: SenderPolicy["org_allowed_senders"];
  onUpdated: () => void;
}) {
  const [emailAddress, setEmailAddress] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleAdd = useCallback(() => {
    const normalizedEmail = emailAddress.trim().toLowerCase();
    if (!isValidEmailAddress(normalizedEmail)) {
      toast.error("Please enter a valid sender email address.");
      return;
    }
    startTransition(async () => {
      try {
        await createAllowedSender({ scope, email_address: normalizedEmail });
        toast.success("Allowed sender saved.");
        setEmailAddress("");
        onUpdated();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to add allowed sender.");
      }
    });
  }, [emailAddress, onUpdated, scope]);

  const handleRemove = useCallback((id: string, email: string) => {
    startTransition(async () => {
      try {
        await deleteAllowedSender(id);
        toast.success(`Removed ${email}.`);
        onUpdated();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to remove allowed sender.");
      }
    });
  }, [onUpdated]);

  return (
    <div className="space-y-4 rounded-[var(--radius-md)] border border-[var(--border-input)] bg-white/70 p-4">
      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h4>
        <p className="text-sm text-[var(--text-secondary)]">{description}</p>
      </div>

      {isOwner ? (
        <div className="flex gap-2">
          <Input value={emailAddress} onChange={(event) => setEmailAddress(event.target.value)} placeholder="billing@supplier.com" type="email" className="h-9 rounded-[var(--radius-sm)] border-[var(--border-input)] bg-white" />
          <Button onClick={handleAdd} disabled={isPending} className="h-9 px-3 cursor-pointer">
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Add
          </Button>
        </div>
      ) : null}

      {senders.length === 0 ? (
        <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--border-input)] bg-white/70 p-3 text-sm text-[var(--text-secondary)]">{emptyMessage}</div>
      ) : (
        <div className="space-y-2">
          {senders.map((sender) => (
            <div key={sender.id} className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--border-input)] bg-white p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[var(--text-primary)]">{sender.email_address}</p>
                <p className="text-xs text-[var(--text-secondary)]">Added {formatTimestamp(sender.created_at)}</p>
              </div>
              {isOwner ? (
                <Button variant="ghost" size="icon" onClick={() => handleRemove(sender.id, sender.email_address)} disabled={isPending} className="size-8 text-[var(--text-secondary)] hover:text-[var(--error)]" aria-label={`Remove ${sender.email_address}`}>
                  <X className="size-4" />
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RecommendationRow({
  recommendation,
  isOwner,
  onUpdated,
}: {
  recommendation: SenderRecommendation;
  isOwner: boolean;
  onUpdated: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  const runAction = useCallback((action: "approve_org" | "approve_location" | "dismiss", successMessage: string) => {
    startTransition(async () => {
      try {
        await updateSenderRecommendation(recommendation.id, action);
        toast.success(successMessage);
        onUpdated();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update sender recommendation.");
      }
    });
  }, [onUpdated, recommendation.id]);

  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--border-input)] bg-white p-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-[var(--text-primary)]">{recommendation.sender_email}</p>
          <Badge variant="outline" className="text-[10px] uppercase tracking-[0.14em]">{recommendation.seen_count} seen</Badge>
        </div>
        {recommendation.sender_name ? <p className="text-sm text-[var(--text-secondary)]">{recommendation.sender_name}</p> : null}
        <p className="text-sm text-[var(--text-secondary)]">
          Sample subject: <span className="font-medium text-[var(--text-primary)]">{recommendation.sample_subject || "No subject captured"}</span>
        </p>
        <p className="text-xs text-[var(--text-secondary)]">Last seen {formatTimestamp(recommendation.last_seen_at)}</p>
      </div>
      {isOwner ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled={isPending} onClick={() => runAction("approve_location", "Sender approved.")} className="h-9 px-3 text-xs cursor-pointer">
            <Plus className="size-3.5" />
            Add
          </Button>
          <Button variant="ghost" size="sm" disabled={isPending} onClick={() => runAction("dismiss", "Sender recommendation dismissed.")} className="h-9 px-3 text-xs text-[var(--text-secondary)] cursor-pointer">
            Dismiss
          </Button>
        </div>
      ) : (
        <div className="rounded-[var(--radius-md)] border border-[var(--border-input)] bg-white/60 px-3 py-2 text-sm text-[var(--text-secondary)]">
          Owner approval required
        </div>
      )}
    </div>
  );
}

function StageBanner({ senderPolicy }: { senderPolicy: SenderPolicy }) {
  if (senderPolicy.mode === "discovery") {
    return <MessageBanner tone="warning" icon={<ShieldAlert className="size-4 shrink-0" />} message="Connected and monitoring for candidate invoice senders. No invoices will be processed until at least one sender is approved." />;
  }
  return <MessageBanner tone="info" icon={<ShieldCheck className="size-4 shrink-0" />} message="Processing approved senders only." />;
}

function InfoField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5 rounded-[var(--radius-md)] border border-[var(--border-input)] bg-white/70 p-4">
      <Label className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--text-secondary)]">{label}</Label>
      {children}
    </div>
  );
}

function ConnectionStatusBadge({ account }: { account: EmailAccountRow }) {
  if (isWorkerDisabled(account)) {
    return <Badge variant="outline" className="border-red-200 text-[10px] text-red-700"><AlertCircle className="size-2.5" />Worker disabled</Badge>;
  }
  if (!account.is_active) {
    return <Badge variant="outline" className="border-amber-200 text-[10px] text-amber-700"><PowerOff className="size-2.5" />Paused</Badge>;
  }
  if (account.consecutive_failures >= 3) {
    return <Badge variant="outline" className="border-red-200 text-[10px] text-red-700"><AlertCircle className="size-2.5" />Attention needed</Badge>;
  }
  if (!account.last_polled_at) {
    return <Badge variant="outline" className="border-[var(--border-input)] text-[10px] text-[var(--text-secondary)]"><Clock className="size-2.5" />Awaiting first poll</Badge>;
  }
  return <Badge variant="outline" className="border-green-200 text-[10px] text-green-700"><CheckCircle2 className="size-2.5" />Active</Badge>;
}

function VerificationStatusBadge({ account }: { account: EmailAccountRow }) {
  if (account.last_verification_status === "verified") {
    return <Badge variant="outline" className="border-emerald-200 text-[10px] text-emerald-700"><ShieldCheck className="size-2.5" />Verified</Badge>;
  }
  if (account.last_verification_status === "failed") {
    return <Badge variant="outline" className="border-amber-200 text-[10px] text-amber-700"><ShieldAlert className="size-2.5" />Verification failed</Badge>;
  }
  return <Badge variant="outline" className="border-[var(--border-input)] text-[10px] text-[var(--text-secondary)]"><Clock className="size-2.5" />Not verified yet</Badge>;
}

function MessageBanner({
  tone,
  icon,
  message,
}: {
  tone: "warning" | "danger" | "info";
  icon: ReactNode;
  message: string;
}) {
  const className =
    tone === "danger"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "info"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-amber-200 bg-amber-50 text-amber-800";
  return <div className={`flex items-start gap-2 rounded-[var(--radius-md)] border p-3 text-sm ${className}`}>{icon}<span>{message}</span></div>;
}

function deduplicateSenders(senders: SenderPolicy["org_allowed_senders"]) {
  const seen = new Set<string>();
  return senders.filter((s) => {
    const key = s.email_address.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function formatTimestamp(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Never";
}

function isWorkerDisabled(account: EmailAccountRow) {
  return !account.is_active && account.consecutive_failures >= 5 && Boolean(account.last_error);
}

function describeHealth(account: EmailAccountRow) {
  if (isWorkerDisabled(account)) return "Disabled after repeated worker failures";
  if (!account.is_active) return "Paused by owner";
  if (account.consecutive_failures >= 3) return `${account.consecutive_failures} consecutive worker failures`;
  if (account.last_error) return "Worker reported an error";
  if (!account.last_polled_at) return "Waiting for the first worker poll";
  return "Healthy";
}
