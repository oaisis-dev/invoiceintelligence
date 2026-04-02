"use client";

import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SystemSetting = {
  id: string;
  vendor_name_pattern: string | null;
  setting_key: string;
  value: string;
  is_active: boolean;
};

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/system-config/settings");
      if (res.ok) {
        setSettings(await res.json());
      } else {
        setError("Failed to load settings.");
      }
    } catch {
      setError("Failed to connect to the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return <div className="text-sm text-[var(--text-secondary)]">Loading settings...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-600">{error}</div>;
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border-glass)] bg-[var(--bg-card)] shadow-[var(--shadow-card)] backdrop-blur-md">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-[var(--border-table)] hover:bg-transparent">
            <TableHead>Setting Key</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Vendor Pattern</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {settings.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-16 text-center text-[var(--text-secondary)]">
                No system normalization settings configured. These are Tier 1 vendor
                parsing defaults that apply when orgs have no overrides.
              </TableCell>
            </TableRow>
          ) : (
            settings.map((s) => (
              <TableRow key={s.id} className="border-b border-[var(--border-table)]/50">
                <TableCell className="font-mono text-xs">{s.setting_key}</TableCell>
                <TableCell className="font-mono text-xs">{s.value}</TableCell>
                <TableCell className="text-xs">{s.vendor_name_pattern || "Global"}</TableCell>
                <TableCell>
                  <Badge variant={s.is_active ? "default" : "secondary"}>
                    {s.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
