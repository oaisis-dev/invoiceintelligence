import { requirePlatformAdmin, hasPermission } from "@/lib/authz";
import { listPlans } from "@/lib/api/subscriptions";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AddPlanButton, EditPlanButton, TogglePlanActiveButton } from "./plan-actions";

function formatPrice(cents: number): string {
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(2)}/mo`;
}

export default async function SubscriptionPlansPage() {
  const ctx = await requirePlatformAdmin();
  const canManage = hasPermission(ctx, "manage_plans");
  const plans = await listPlans();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
            Subscription Plans
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Manage plan tiers, limits, and pricing
          </p>
        </div>
        {canManage && <AddPlanButton />}
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[var(--border-glass)] bg-[var(--bg-card)] shadow-[var(--shadow-card)] backdrop-blur-md">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-[var(--border-table)] hover:bg-transparent">
              <TableHead>Display Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead className="text-right">Invoices</TableHead>
              <TableHead className="text-right">Users</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead>Stripe Price ID</TableHead>
              <TableHead className="text-right">Promo</TableHead>
              <TableHead>Status</TableHead>
              {canManage && (
                <TableHead className="text-right">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canManage ? 10 : 9}
                  className="h-24 text-center text-[var(--text-secondary)]"
                >
                  No subscription plans configured.
                </TableCell>
              </TableRow>
            ) : (
              plans.map((plan) => (
                <TableRow
                  key={plan.id}
                  className="border-b border-[var(--border-table)]/50"
                >
                  <TableCell className="font-medium">
                    {plan.display_name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{plan.workspace_type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        plan.tier === "enterprise" ? "default" : "outline"
                      }
                    >
                      {plan.tier}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {plan.monthly_invoice_limit >= 9999
                      ? "Unlimited"
                      : plan.monthly_invoice_limit.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {plan.max_users >= 999
                      ? "Unlimited"
                      : plan.max_users.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPrice(plan.price_cents)}
                  </TableCell>
                  <TableCell className="max-w-[160px] truncate text-sm text-[var(--text-secondary)]">
                    {plan.payment_price_id ?? "--"}
                  </TableCell>
                  <TableCell className="text-right">
                    {plan.promo_price_dollars != null ? (
                      <span className="text-sm">
                        ${plan.promo_price_dollars}/mo
                        {plan.promo_max_slots != null && (
                          <span className="ml-1 text-[var(--text-secondary)]">
                            ({plan.promo_max_slots} slots)
                          </span>
                        )}
                      </span>
                    ) : (
                      "--"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={plan.is_active ? "default" : "secondary"}
                    >
                      {plan.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <EditPlanButton plan={plan} />
                        <TogglePlanActiveButton plan={plan} />
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
