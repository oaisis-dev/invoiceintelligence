"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, AlertCircle, Mail, Settings } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getEmailAccounts, type EmailAccountPayload } from "@/lib/api-client";

type Account = EmailAccountPayload["accounts"][0];

function ConnectionStatus({ account }: { account: Account }) {
  const needsAttention =
    account.consecutive_failures > 0 || account.last_verification_status === "failed";

  const isPaused = !account.is_active;

  return (
    <div className="flex items-center gap-2">
      {isPaused ? (
        <>
          <div className="size-2 rounded-full bg-amber-500" />
          <span className="text-[13px] font-medium text-amber-700">Paused</span>
        </>
      ) : needsAttention ? (
        <>
          <AlertCircle className="size-4 text-red-500" />
          <span className="text-[13px] font-medium text-red-700">Needs attention</span>
        </>
      ) : (
        <>
          <CheckCircle2 className="size-4 text-emerald-500" />
          <span className="text-[13px] font-medium text-emerald-700">Connected</span>
        </>
      )}
    </div>
  );
}

export function EmailConnectionBanner() {
  const [account, setAccount] = useState<Account | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getEmailAccounts();
      const primary = data.accounts.find((a) => a.is_active) ?? data.accounts[0] ?? null;
      setAccount(primary);
    } catch {
      // Silently fail — banner is informational
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!loaded) return null;

  if (!account) {
    return (
      <GlassCard className="flex items-center justify-between px-5 py-3.5">
        <div className="flex items-center gap-3">
          <Mail className="size-5 text-[var(--text-secondary)]" />
          <div>
            <p className="text-[13px] font-medium text-[var(--text-primary)]">
              No email connected
            </p>
            <p className="text-[12px] text-[var(--text-secondary)]">
              Connect an inbox to automatically receive invoices via email
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/settings/email-accounts" className="gap-2">
            <Settings className="size-4" />
            Set up
          </Link>
        </Button>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="flex items-center justify-between px-5 py-3.5">
      <div className="flex items-center gap-3">
        <Mail className="size-5 text-[var(--text-secondary)]" />
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-[12px] font-normal">
            {account.email_address}
          </Badge>
          <ConnectionStatus account={account} />
        </div>
      </div>
      <Button variant="outline" size="sm" asChild>
        <Link href="/settings/email-accounts" className="gap-2">
          <Settings className="size-4" />
          Manage
        </Link>
      </Button>
    </GlassCard>
  );
}
