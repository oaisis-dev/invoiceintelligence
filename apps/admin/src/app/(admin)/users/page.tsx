import Link from "next/link";
import { getUsers } from "@/lib/api/users";
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

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const params = await searchParams;
  const search = params.search ?? "";
  const page = Number(params.page ?? "1");

  const { data: users, total } = await getUsers({ search, page });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          Users
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          All users across all organizations
        </p>
      </div>

      <SearchInput placeholder="Search by email or name..." />

      <div className="rounded-[var(--radius-lg)] border border-[var(--border-glass)] bg-[var(--bg-card)] shadow-[var(--shadow-card)] backdrop-blur-md">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-[var(--border-table)] hover:bg-transparent">
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-[var(--text-secondary)]">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow
                  key={user.id}
                  className="border-b border-[var(--border-table)]/50 hover:bg-[var(--primary-05)]"
                >
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell className="text-[var(--text-secondary)]">
                    {user.display_name ?? "--"}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/organizations/${user.org_id}`}
                      className="text-[var(--primary)] hover:underline"
                    >
                      {user.org_name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{user.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.is_active ? "default" : "secondary"}>
                      {user.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[var(--text-secondary)]">
                    {formatDate(user.created_at)}
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
