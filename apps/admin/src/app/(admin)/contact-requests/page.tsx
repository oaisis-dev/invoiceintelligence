import { requirePlatformAdmin, hasPermission } from "@/lib/authz";
import { getContactRequests } from "@/lib/api/contact-requests";
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
import { UpdateStatusButton } from "./contact-actions";
import { NotificationEmailSetting } from "./notification-settings";

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  pending: "outline",
  contacted: "secondary",
  resolved: "default",
};

export default async function ContactRequestsPage() {
  const ctx = await requirePlatformAdmin();
  const canManage = hasPermission(ctx, "manage_billing");

  const requests = await getContactRequests();

  const colCount = canManage ? 8 : 7;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          Contact Requests
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Enterprise inquiries and contact form submissions
        </p>
      </div>

      {canManage && <NotificationEmailSetting />}

      <div className="rounded-[var(--radius-lg)] border border-[var(--border-glass)] bg-[var(--bg-card)] shadow-[var(--shadow-card)] backdrop-blur-md">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-[var(--border-table)] hover:bg-transparent">
              <TableHead>Name</TableHead>
              <TableHead>Business</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Demo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              {canManage && (
                <TableHead className="text-right">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={colCount}
                  className="h-24 text-center text-[var(--text-secondary)]"
                >
                  No contact requests yet.
                </TableCell>
              </TableRow>
            ) : (
              requests.map((req) => (
                <TableRow
                  key={req.id}
                  className="border-b border-[var(--border-table)]/50"
                >
                  <TableCell className="font-medium">{req.name}</TableCell>
                  <TableCell className="text-sm">
                    {req.business_name ?? "--"}
                  </TableCell>
                  <TableCell>{req.email}</TableCell>
                  <TableCell className="max-w-[300px] truncate text-sm text-[var(--text-secondary)]">
                    {req.message ?? "--"}
                  </TableCell>
                  <TableCell>
                    {req.demo_requested ? (
                      <Badge variant="default">Yes</Badge>
                    ) : (
                      <span className="text-sm text-[var(--text-secondary)]">
                        No
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[req.status] ?? "outline"}>
                      {req.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-[var(--text-secondary)]">
                    {formatDateTime(req.created_at)}
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {req.status === "pending" && (
                          <UpdateStatusButton
                            request={req}
                            targetStatus="contacted"
                            label="Mark Contacted"
                          />
                        )}
                        {req.status !== "resolved" && (
                          <UpdateStatusButton
                            request={req}
                            targetStatus="resolved"
                            label="Resolve"
                          />
                        )}
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
