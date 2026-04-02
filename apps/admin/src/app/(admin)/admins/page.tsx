import { requirePlatformAdmin, hasPermission } from "@/lib/authz";
import { getPlatformAdmins } from "@/lib/api/admins";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import {
  AddAdminButton,
  EditAdminButton,
  ToggleActiveButton,
  DeleteAdminButton,
} from "./admin-actions";

export default async function AdminsPage() {
  const ctx = await requirePlatformAdmin();
  const isSuperAdmin = hasPermission(ctx, "manage_platform");
  const admins = await getPlatformAdmins();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
            Platform Admins
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Manage platform administrator accounts and permissions
          </p>
        </div>
        {isSuperAdmin && <AddAdminButton />}
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[var(--border-glass)] bg-[var(--bg-card)] shadow-[var(--shadow-card)] backdrop-blur-md">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-[var(--border-table)] hover:bg-transparent">
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Added</TableHead>
              {isSuperAdmin && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {admins.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isSuperAdmin ? 6 : 5}
                  className="h-24 text-center text-[var(--text-secondary)]"
                >
                  No platform admins configured.
                </TableCell>
              </TableRow>
            ) : (
              admins.map((admin) => (
                <TableRow
                  key={admin.id}
                  className="border-b border-[var(--border-table)]/50"
                >
                  <TableCell className="font-medium">
                    {admin.email}
                    {admin.id === ctx.adminId && (
                      <span className="ml-2 text-xs text-[var(--text-secondary)]">
                        (you)
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-[var(--text-secondary)]">
                    {admin.display_name ?? "--"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {admin.permissions.map((perm) => (
                        <Badge
                          key={perm}
                          variant={
                            perm === "manage_platform" ? "default" : "outline"
                          }
                          className="text-xs"
                        >
                          {perm}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={admin.is_active ? "default" : "secondary"}
                    >
                      {admin.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-[var(--text-secondary)]">
                    {formatDateTime(admin.created_at)}
                  </TableCell>
                  {isSuperAdmin && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <EditAdminButton
                          admin={admin}
                          currentAdminId={ctx.adminId}
                        />
                        <ToggleActiveButton
                          admin={admin}
                          currentAdminId={ctx.adminId}
                        />
                        <DeleteAdminButton
                          admin={admin}
                          currentAdminId={ctx.adminId}
                        />
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
