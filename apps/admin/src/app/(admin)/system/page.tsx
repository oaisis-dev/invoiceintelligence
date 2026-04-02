import { getPlatformSettings } from "@/lib/api/settings";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { MaintenanceToggle } from "@/components/maintenance-toggle";

export default async function SystemPage() {
  const settings = await getPlatformSettings();

  const envInfo = [
    { label: "Node Environment", value: process.env.NODE_ENV ?? "unknown" },
    { label: "Auth", value: "Google OAuth" },
    { label: "Supabase URL", value: process.env.SUPABASE_URL ? "configured" : "not set" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          System
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Environment information and platform settings
        </p>
      </div>

      {/* Maintenance Mode */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
          Client App — Maintenance Mode
        </h2>
        <MaintenanceToggle />
      </section>

      {/* Environment Info */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
          Environment
        </h2>
        <div className="rounded-[var(--radius-lg)] border border-[var(--border-glass)] bg-[var(--bg-card)] shadow-[var(--shadow-card)] backdrop-blur-md">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[var(--border-table)] hover:bg-transparent">
                <TableHead>Setting</TableHead>
                <TableHead>Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {envInfo.map((item) => (
                <TableRow
                  key={item.label}
                  className="border-b border-[var(--border-table)]/50"
                >
                  <TableCell className="font-medium">{item.label}</TableCell>
                  <TableCell className="font-mono text-sm text-[var(--text-secondary)]">
                    {item.value}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Platform Settings */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
          Platform Settings
        </h2>
        <div className="rounded-[var(--radius-lg)] border border-[var(--border-glass)] bg-[var(--bg-card)] shadow-[var(--shadow-card)] backdrop-blur-md">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[var(--border-table)] hover:bg-transparent">
                <TableHead>Key</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {settings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-16 text-center text-[var(--text-secondary)]">
                    No platform settings configured.
                  </TableCell>
                </TableRow>
              ) : (
                settings.map((setting) => (
                  <TableRow
                    key={setting.key}
                    className="border-b border-[var(--border-table)]/50"
                  >
                    <TableCell className="font-mono text-sm font-medium">
                      {setting.key}
                    </TableCell>
                    <TableCell className="max-w-xs truncate font-mono text-sm text-[var(--text-secondary)]">
                      {JSON.stringify(setting.value)}
                    </TableCell>
                    <TableCell className="text-sm text-[var(--text-secondary)]">
                      {setting.description ?? "--"}
                    </TableCell>
                    <TableCell className="text-sm text-[var(--text-secondary)]">
                      {formatDateTime(setting.updated_at)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
