"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { SubscriptionPlan, SubscriptionUsage } from "@/types/database";

interface SubscriptionSectionProps {
  orgId: string;
  canManage: boolean;
}

type OrgSubscriptionData = {
  org: Record<string, unknown>;
  plan: SubscriptionPlan | null;
  usage: SubscriptionUsage | null;
};

export function SubscriptionSection({
  orgId,
  canManage,
}: SubscriptionSectionProps) {
  const [data, setData] = useState<OrgSubscriptionData | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [subRes, plansRes] = await Promise.all([
          fetch(`/api/organizations/${orgId}/subscription`),
          fetch("/api/subscription-plans"),
        ]);
        if (subRes.ok) setData(await subRes.json());
        if (plansRes.ok) {
          const p = await plansRes.json();
          setPlans(p.plans ?? []);
        }
      } catch {
        // silently fail — section just won't render data
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [orgId]);

  if (loading) {
    return (
      <section>
        <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
          Subscription
        </h2>
        <div className="rounded-[var(--radius-lg)] border border-[var(--border-glass)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)] backdrop-blur-md">
          <p className="text-sm text-[var(--text-secondary)]">Loading...</p>
        </div>
      </section>
    );
  }

  if (!data) return null;

  const { org, plan, usage } = data;

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
        Subscription
      </h2>
      <div className="rounded-[var(--radius-lg)] border border-[var(--border-glass)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)] backdrop-blur-md">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <InfoItem
            label="Current Plan"
            value={plan?.display_name ?? "None"}
          />
          <InfoItem label="Status">
            <Badge
              variant={
                org.subscription_status === "active"
                  ? "default"
                  : "secondary"
              }
            >
              {String(org.subscription_status ?? "active")}
            </Badge>
          </InfoItem>
          <InfoItem
            label="Invoice Limit"
            value={`${usage?.monthly_invoice_count ?? 0} / ${org.monthly_invoice_limit ?? 0}`}
          />
          <InfoItem
            label="User Limit"
            value={`${usage?.active_user_count ?? 0} / ${org.max_users ?? 0}`}
          />
          <InfoItem
            label="Provider"
            value={String(org.payment_provider ?? "None")}
          />
          <InfoItem
            label="Customer ID"
            value={String(org.payment_customer_id ?? "--")}
          />
          {org.grace_period_end ? (
            <InfoItem
              label="Grace Period End"
              value={new Date(
                String(org.grace_period_end)
              ).toLocaleDateString()}
            />
          ) : null}
        </div>

        {canManage && (
          <div className="mt-6 flex gap-2 border-t border-[var(--border-table)] pt-4">
            <AssignPlanDialog orgId={orgId} plans={plans} currentPlanId={plan?.id} />
            <OverrideLimitsDialog
              orgId={orgId}
              currentInvoiceLimit={Number(org.monthly_invoice_limit ?? 10)}
              currentMaxUsers={Number(org.max_users ?? 1)}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function InfoItem({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-[var(--text-secondary)]">
        {label}
      </p>
      {children ?? (
        <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
          {value}
        </p>
      )}
    </div>
  );
}

function AssignPlanDialog({
  orgId,
  plans,
  currentPlanId,
}: {
  orgId: string;
  plans: SubscriptionPlan[];
  currentPlanId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState(currentPlanId ?? "");
  const router = useRouter();

  async function handleSubmit() {
    if (!selectedPlanId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/organizations/${orgId}/subscription`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: selectedPlanId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to assign plan");
      }
      toast.success("Plan assigned successfully");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to assign plan"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Assign Plan
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Plan</DialogTitle>
          <DialogDescription>
            Select a plan to assign. Limits will be copied from the plan.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label>Plan</Label>
            <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a plan..." />
              </SelectTrigger>
              <SelectContent>
                {plans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.display_name} ({p.workspace_type} / {p.tier})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !selectedPlanId}>
            {loading ? "Assigning..." : "Assign Plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OverrideLimitsDialog({
  orgId,
  currentInvoiceLimit,
  currentMaxUsers,
}: {
  orgId: string;
  currentInvoiceLimit: number;
  currentMaxUsers: number;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [invoiceLimit, setInvoiceLimit] = useState(currentInvoiceLimit);
  const [maxUsers, setMaxUsers] = useState(currentMaxUsers);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/organizations/${orgId}/subscription`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthly_invoice_limit: invoiceLimit,
          max_users: maxUsers,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update limits");
      }
      toast.success("Limits updated");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update limits"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Override Limits
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Override Limits</DialogTitle>
            <DialogDescription>
              Set custom limits for this organization, independent of their plan.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label>Monthly Invoice Limit</Label>
              <Input
                type="number"
                value={invoiceLimit}
                onChange={(e) => setInvoiceLimit(Number(e.target.value))}
                min={1}
              />
            </div>
            <div className="space-y-2">
              <Label>Max Users</Label>
              <Input
                type="number"
                value={maxUsers}
                onChange={(e) => setMaxUsers(Number(e.target.value))}
                min={1}
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
