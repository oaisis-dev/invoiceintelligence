import Link from "next/link";
import { getOrganizations } from "@/lib/api/organizations";
import { SearchInput } from "@/components/search-input";
import { Pagination } from "@/components/pagination";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format";

export default async function OrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const params = await searchParams;
  const search = params.search ?? "";
  const page = Number(params.page ?? "1");

  const { data: orgs, total } = await getOrganizations({ search, page });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          Organizations
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          All organizations on the platform
        </p>
      </div>

      <SearchInput placeholder="Search by name or slug..." />

      <div className="rounded-[var(--radius-lg)] border border-[var(--border-glass)] bg-[var(--bg-card)] shadow-[var(--shadow-card)] backdrop-blur-md">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-[var(--border-table)] hover:bg-transparent">
              <TableHead className="text-sm font-medium text-[var(--text-secondary)]">Name</TableHead>
              <TableHead className="text-sm font-medium text-[var(--text-secondary)]">Slug</TableHead>
              <TableHead className="text-sm font-medium text-[var(--text-secondary)]">Type</TableHead>
              <TableHead className="text-sm font-medium text-[var(--text-secondary)] text-right">Members</TableHead>
              <TableHead className="text-sm font-medium text-[var(--text-secondary)] text-right">Invoices</TableHead>
              <TableHead className="text-sm font-medium text-[var(--text-secondary)]">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orgs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-[var(--text-secondary)]">
                  No organizations found.
                </TableCell>
              </TableRow>
            ) : (
              orgs.map((org) => (
                <TableRow
                  key={org.id}
                  className="border-b border-[var(--border-table)]/50 hover:bg-[var(--primary-05)]"
                >
                  <TableCell>
                    <Link
                      href={`/organizations/${org.id}`}
                      className="font-medium text-[var(--primary)] hover:underline"
                    >
                      {org.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-[var(--text-secondary)]">
                    {org.slug}
                  </TableCell>
                  <TableCell>
                    <Badge variant={org.workspace_type === "organization" ? "default" : "secondary"}>
                      {org.workspace_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{org.member_count}</TableCell>
                  <TableCell className="text-right">{org.invoice_count}</TableCell>
                  <TableCell className="text-[var(--text-secondary)]">
                    {formatDate(org.created_at)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination total={total} />
    </div>
  );
}
