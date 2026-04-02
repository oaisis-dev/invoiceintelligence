import { notFound } from "next/navigation";
import { getOrganizationById } from "@/lib/api/organizations";
import { requirePlatformAdmin, hasPermission } from "@/lib/authz";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatCurrency } from "@/lib/format";
import { SubscriptionSection } from "./subscription-section";

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requirePlatformAdmin();
  const canManageBilling = hasPermission(ctx, "manage_billing");

  let orgData;
  try {
    orgData = await getOrganizationById(id);
  } catch {
    notFound();
  }

  const { organization, members, locations, recentInvoices, emailAccounts } =
    orgData;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border-glass)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)] backdrop-blur-md">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
              {organization.name}
            </h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {organization.slug}
            </p>
          </div>
          <Badge
            variant={
              organization.workspace_type === "organization"
                ? "default"
                : "secondary"
            }
          >
            {organization.workspace_type}
          </Badge>
        </div>
        <p className="mt-4 text-sm text-[var(--text-secondary)]">
          Created {formatDate(organization.created_at)}
        </p>
      </div>

      {/* Subscription */}
      <SubscriptionSection orgId={id} canManage={canManageBilling} />

      {/* Members */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
          Members ({members.length})
        </h2>
        <div className="rounded-[var(--radius-lg)] border border-[var(--border-glass)] bg-[var(--bg-card)] shadow-[var(--shadow-card)] backdrop-blur-md">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[var(--border-table)] hover:bg-transparent">
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id} className="border-b border-[var(--border-table)]/50">
                  <TableCell>{m.email}</TableCell>
                  <TableCell>{m.display_name ?? "--"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{m.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={m.is_active ? "default" : "secondary"}>
                      {m.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Locations */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
          Locations ({locations.length})
        </h2>
        <div className="rounded-[var(--radius-lg)] border border-[var(--border-glass)] bg-[var(--bg-card)] shadow-[var(--shadow-card)] backdrop-blur-md">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[var(--border-table)] hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Default</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.map((loc) => (
                <TableRow key={loc.id} className="border-b border-[var(--border-table)]/50">
                  <TableCell className="font-medium">{loc.name}</TableCell>
                  <TableCell className="text-[var(--text-secondary)]">
                    {loc.address ?? "--"}
                  </TableCell>
                  <TableCell>{loc.is_default ? "Yes" : "No"}</TableCell>
                  <TableCell>
                    <Badge variant={loc.is_active ? "default" : "secondary"}>
                      {loc.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Recent Invoices */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
          Recent Invoices
        </h2>
        <div className="rounded-[var(--radius-lg)] border border-[var(--border-glass)] bg-[var(--bg-card)] shadow-[var(--shadow-card)] backdrop-blur-md">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[var(--border-table)] hover:bg-transparent">
                <TableHead>Vendor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-16 text-center text-[var(--text-secondary)]">
                    No invoices yet.
                  </TableCell>
                </TableRow>
              ) : (
                recentInvoices.map((inv) => (
                  <TableRow key={inv.id} className="border-b border-[var(--border-table)]/50">
                    <TableCell className="font-medium">
                      {inv.vendor_name ?? "Unknown"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{inv.status}</Badge>
                    </TableCell>
                    <TableCell className="text-[var(--text-secondary)]">
                      {inv.source}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(inv.total_amount)}
                    </TableCell>
                    <TableCell className="text-[var(--text-secondary)]">
                      {formatDate(inv.created_at)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Email Accounts */}
      {emailAccounts.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
            Email Accounts ({emailAccounts.length})
          </h2>
          <div className="rounded-[var(--radius-lg)] border border-[var(--border-glass)] bg-[var(--bg-card)] shadow-[var(--shadow-card)] backdrop-blur-md">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[var(--border-table)] hover:bg-transparent">
                  <TableHead>Email</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Connected</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emailAccounts.map((ea) => (
                  <TableRow key={ea.id} className="border-b border-[var(--border-table)]/50">
                    <TableCell className="font-medium">{ea.email_address}</TableCell>
                    <TableCell className="capitalize">{ea.provider}</TableCell>
                    <TableCell>
                      <Badge variant={ea.is_active ? "default" : "secondary"}>
                        {ea.is_active ? "Active" : "Disconnected"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[var(--text-secondary)]">
                      {formatDate(ea.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}
    </div>
  );
}
