import { Building2, Users, FileText, TrendingUp, CreditCard, MessageSquare } from "lucide-react";
import { getPlatformStats } from "@/lib/api/stats";
import { StatCard } from "@/components/stat-card";

export default async function DashboardPage() {
  const stats = await getPlatformStats();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Platform overview and key metrics
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Organizations"
          value={stats.total_orgs}
          icon={Building2}
        />
        <StatCard
          title="Total Users"
          value={stats.total_users}
          icon={Users}
        />
        <StatCard
          title="Total Invoices"
          value={stats.total_invoices}
          icon={FileText}
        />
        <StatCard
          title="Invoices This Week"
          value={stats.invoices_this_week}
          icon={TrendingUp}
        />
        {stats.paid_orgs !== undefined && (
          <StatCard
            title="Paid Organizations"
            value={stats.paid_orgs}
            icon={CreditCard}
          />
        )}
        {stats.pending_contact_requests !== undefined && (
          <StatCard
            title="Pending Contact Requests"
            value={stats.pending_contact_requests}
            icon={MessageSquare}
          />
        )}
      </div>
    </div>
  );
}
