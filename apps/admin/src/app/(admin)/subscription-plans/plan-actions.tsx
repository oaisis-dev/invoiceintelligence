"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SubscriptionPlan } from "@/types/database";

// -- Shared form fields --

function PlanFormFields({
  workspaceType,
  setWorkspaceType,
  tier,
  setTier,
  displayName,
  setDisplayName,
  monthlyInvoiceLimit,
  setMonthlyInvoiceLimit,
  maxUsers,
  setMaxUsers,
  priceCents,
  setPriceCents,
  paymentPriceId,
  setPaymentPriceId,
  promoPriceDollars,
  setPromoPriceDollars,
  promoLabel,
  setPromoLabel,
  promoMaxSlots,
  setPromoMaxSlots,
  promoPaymentPriceId,
  setPromoPaymentPriceId,
  features,
  setFeatures,
  sortOrder,
  setSortOrder,
  isActive,
  setIsActive,
  disableTypeAndTier,
}: {
  workspaceType: string;
  setWorkspaceType: (v: string) => void;
  tier: string;
  setTier: (v: string) => void;
  displayName: string;
  setDisplayName: (v: string) => void;
  monthlyInvoiceLimit: number;
  setMonthlyInvoiceLimit: (v: number) => void;
  maxUsers: number;
  setMaxUsers: (v: number) => void;
  priceCents: number;
  setPriceCents: (v: number) => void;
  paymentPriceId: string;
  setPaymentPriceId: (v: string) => void;
  promoPriceDollars: number;
  setPromoPriceDollars: (v: number) => void;
  promoLabel: string;
  setPromoLabel: (v: string) => void;
  promoMaxSlots: number;
  setPromoMaxSlots: (v: number) => void;
  promoPaymentPriceId: string;
  setPromoPaymentPriceId: (v: string) => void;
  features: string;
  setFeatures: (v: string) => void;
  sortOrder: number;
  setSortOrder: (v: number) => void;
  isActive: boolean;
  setIsActive: (v: boolean) => void;
  disableTypeAndTier?: boolean;
}) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>Workspace Type</Label>
        <Select
          value={workspaceType}
          onValueChange={setWorkspaceType}
          disabled={disableTypeAndTier}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="individual">Individual</SelectItem>
            <SelectItem value="organization">Organization</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Tier</Label>
        <Input
          value={tier}
          onChange={(e) => setTier(e.target.value)}
          placeholder="free, pro, enterprise..."
          disabled={disableTypeAndTier}
        />
      </div>
      <div className="col-span-2 space-y-2">
        <Label>Display Name</Label>
        <Input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Team Pro"
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Monthly Invoice Limit</Label>
        <Input
          type="number"
          value={monthlyInvoiceLimit}
          onChange={(e) => setMonthlyInvoiceLimit(Number(e.target.value))}
          min={0}
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
      <div className="space-y-2">
        <Label>Price (cents)</Label>
        <Input
          type="number"
          value={priceCents}
          onChange={(e) => setPriceCents(Number(e.target.value))}
          min={0}
        />
        <p className="text-xs text-[var(--text-secondary)]">
          {priceCents > 0
            ? `$${(priceCents / 100).toFixed(2)}/mo`
            : "Free"}
        </p>
      </div>
      <div className="space-y-2">
        <Label>Sort Order</Label>
        <Input
          type="number"
          value={sortOrder}
          onChange={(e) => setSortOrder(Number(e.target.value))}
        />
      </div>
      <div className="col-span-2 space-y-2">
        <Label>Stripe Price ID</Label>
        <Input
          value={paymentPriceId}
          onChange={(e) => setPaymentPriceId(e.target.value)}
          placeholder="price_..."
        />
      </div>

      {/* Promo pricing */}
      <div className="col-span-2 mt-2 border-t pt-4">
        <p className="mb-3 text-sm font-medium text-[var(--text-secondary)]">Promotional Pricing</p>
      </div>
      <div className="space-y-2">
        <Label>Promo Price ($)</Label>
        <Input
          type="number"
          value={promoPriceDollars}
          onChange={(e) => setPromoPriceDollars(Number(e.target.value))}
          min={0}
          placeholder="100"
        />
        {promoPriceDollars > 0 && (
          <p className="text-xs text-[var(--text-secondary)]">${promoPriceDollars}/mo</p>
        )}
      </div>
      <div className="space-y-2">
        <Label>Promo Max Slots</Label>
        <Input
          type="number"
          value={promoMaxSlots}
          onChange={(e) => setPromoMaxSlots(Number(e.target.value))}
          min={0}
          placeholder="20"
        />
      </div>
      <div className="col-span-2 space-y-2">
        <Label>Promo Label</Label>
        <Input
          value={promoLabel}
          onChange={(e) => setPromoLabel(e.target.value)}
          placeholder="Founding Customer"
        />
      </div>
      <div className="col-span-2 space-y-2">
        <Label>Promo Stripe Price ID</Label>
        <Input
          value={promoPaymentPriceId}
          onChange={(e) => setPromoPaymentPriceId(e.target.value)}
          placeholder="price_..."
        />
      </div>

      <div className="col-span-2 space-y-2">
        <Label>Features (one per line)</Label>
        <textarea
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          value={features}
          onChange={(e) => setFeatures(e.target.value)}
          placeholder={"100 invoices/month\nUp to 10 users\nEmail intake"}
        />
      </div>
      <div className="col-span-2 flex items-center gap-2">
        <input
          type="checkbox"
          id="is-active"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="h-4 w-4"
        />
        <Label htmlFor="is-active">Active (visible on pricing page)</Label>
      </div>
    </div>
  );
}

// -- Add Plan --

export function AddPlanButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [workspaceType, setWorkspaceType] = useState("organization");
  const [tier, setTier] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [monthlyInvoiceLimit, setMonthlyInvoiceLimit] = useState(10);
  const [maxUsers, setMaxUsers] = useState(1);
  const [priceCents, setPriceCents] = useState(0);
  const [paymentPriceId, setPaymentPriceId] = useState("");
  const [promoPriceDollars, setPromoPriceDollars] = useState(0);
  const [promoLabel, setPromoLabel] = useState("");
  const [promoMaxSlots, setPromoMaxSlots] = useState(0);
  const [promoPaymentPriceId, setPromoPaymentPriceId] = useState("");
  const [features, setFeatures] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/subscription-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_type: workspaceType,
          tier: tier.trim(),
          display_name: displayName.trim(),
          monthly_invoice_limit: monthlyInvoiceLimit,
          max_users: maxUsers,
          price_cents: priceCents,
          payment_price_id: paymentPriceId.trim() || null,
          promo_price_dollars: promoPriceDollars || null,
          promo_label: promoLabel.trim() || null,
          promo_max_slots: promoMaxSlots || null,
          promo_payment_price_id: promoPaymentPriceId.trim() || null,
          features: features
            .split("\n")
            .map((f) => f.trim())
            .filter(Boolean),
          is_active: isActive,
          sort_order: sortOrder,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create plan");
      }

      toast.success("Plan created successfully");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create plan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Plan
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Subscription Plan</DialogTitle>
            <DialogDescription>
              Define a new subscription plan. Set the Stripe Price ID after
              creating the product in Stripe Dashboard.
            </DialogDescription>
          </DialogHeader>
          <PlanFormFields
            workspaceType={workspaceType}
            setWorkspaceType={setWorkspaceType}
            tier={tier}
            setTier={setTier}
            displayName={displayName}
            setDisplayName={setDisplayName}
            monthlyInvoiceLimit={monthlyInvoiceLimit}
            setMonthlyInvoiceLimit={setMonthlyInvoiceLimit}
            maxUsers={maxUsers}
            setMaxUsers={setMaxUsers}
            priceCents={priceCents}
            setPriceCents={setPriceCents}
            paymentPriceId={paymentPriceId}
            setPaymentPriceId={setPaymentPriceId}
            promoPriceDollars={promoPriceDollars}
            setPromoPriceDollars={setPromoPriceDollars}
            promoLabel={promoLabel}
            setPromoLabel={setPromoLabel}
            promoMaxSlots={promoMaxSlots}
            setPromoMaxSlots={setPromoMaxSlots}
            promoPaymentPriceId={promoPaymentPriceId}
            setPromoPaymentPriceId={setPromoPaymentPriceId}
            features={features}
            setFeatures={setFeatures}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
            isActive={isActive}
            setIsActive={setIsActive}
          />
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Plan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// -- Edit Plan --

export function EditPlanButton({ plan }: { plan: SubscriptionPlan }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [workspaceType, setWorkspaceType] = useState<string>(plan.workspace_type);
  const [tier, setTier] = useState<string>(plan.tier);
  const [displayName, setDisplayName] = useState(plan.display_name);
  const [monthlyInvoiceLimit, setMonthlyInvoiceLimit] = useState(
    plan.monthly_invoice_limit
  );
  const [maxUsers, setMaxUsers] = useState(plan.max_users);
  const [priceCents, setPriceCents] = useState(plan.price_cents);
  const [paymentPriceId, setPaymentPriceId] = useState(
    plan.payment_price_id ?? ""
  );
  const [promoPriceDollars, setPromoPriceDollars] = useState(
    plan.promo_price_dollars ?? 0
  );
  const [promoLabel, setPromoLabel] = useState(plan.promo_label ?? "");
  const [promoMaxSlots, setPromoMaxSlots] = useState(
    plan.promo_max_slots ?? 0
  );
  const [promoPaymentPriceId, setPromoPaymentPriceId] = useState(
    plan.promo_payment_price_id ?? ""
  );
  const [features, setFeatures] = useState(plan.features.join("\n"));
  const [sortOrder, setSortOrder] = useState(plan.sort_order);
  const [isActive, setIsActive] = useState(plan.is_active);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/subscription-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: plan.id,
          workspace_type: workspaceType,
          tier: tier.trim(),
          display_name: displayName.trim(),
          monthly_invoice_limit: monthlyInvoiceLimit,
          max_users: maxUsers,
          price_cents: priceCents,
          payment_price_id: paymentPriceId.trim() || null,
          promo_price_dollars: promoPriceDollars || null,
          promo_label: promoLabel.trim() || null,
          promo_max_slots: promoMaxSlots || null,
          promo_payment_price_id: promoPaymentPriceId.trim() || null,
          features: features
            .split("\n")
            .map((f) => f.trim())
            .filter(Boolean),
          is_active: isActive,
          sort_order: sortOrder,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update plan");
      }

      toast.success("Plan updated successfully");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update plan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Plan</DialogTitle>
            <DialogDescription>{plan.display_name}</DialogDescription>
          </DialogHeader>
          <PlanFormFields
            workspaceType={workspaceType}
            setWorkspaceType={setWorkspaceType}
            tier={tier}
            setTier={setTier}
            displayName={displayName}
            setDisplayName={setDisplayName}
            monthlyInvoiceLimit={monthlyInvoiceLimit}
            setMonthlyInvoiceLimit={setMonthlyInvoiceLimit}
            maxUsers={maxUsers}
            setMaxUsers={setMaxUsers}
            priceCents={priceCents}
            setPriceCents={setPriceCents}
            paymentPriceId={paymentPriceId}
            setPaymentPriceId={setPaymentPriceId}
            promoPriceDollars={promoPriceDollars}
            setPromoPriceDollars={setPromoPriceDollars}
            promoLabel={promoLabel}
            setPromoLabel={setPromoLabel}
            promoMaxSlots={promoMaxSlots}
            setPromoMaxSlots={setPromoMaxSlots}
            promoPaymentPriceId={promoPaymentPriceId}
            setPromoPaymentPriceId={setPromoPaymentPriceId}
            features={features}
            setFeatures={setFeatures}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
            isActive={isActive}
            setIsActive={setIsActive}
            disableTypeAndTier
          />
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// -- Toggle Active --

export function TogglePlanActiveButton({ plan }: { plan: SubscriptionPlan }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleToggle() {
    setLoading(true);
    try {
      const res = await fetch("/api/subscription-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: plan.id,
          is_active: !plan.is_active,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update plan");
      }

      toast.success(
        plan.is_active ? "Plan deactivated" : "Plan activated"
      );
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update plan"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleToggle}
      disabled={loading}
    >
      {loading ? "..." : plan.is_active ? "Deactivate" : "Activate"}
    </Button>
  );
}
