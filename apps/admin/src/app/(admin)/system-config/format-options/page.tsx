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

type FormatOption = {
  id: string;
  setting_key: string;
  option_value: string;
  display_label: string;
  region_hint: string | null;
  sort_order: number;
  is_active: boolean;
};

export default function FormatOptionsPage() {
  const [options, setOptions] = useState<FormatOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      // Format options would come from a dedicated backend-api endpoint
      // For now, show empty state since the endpoint may not exist yet
      setOptions([]);
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
    return <div className="text-sm text-[var(--text-secondary)]">Loading format options...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-600">{error}</div>;
  }

  const settingKeys = [...new Set(options.map((o) => o.setting_key))].sort();

  return (
    <div className="space-y-6">
      {settingKeys.length === 0 && options.length === 0 && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--border-glass)] bg-[var(--bg-card)] p-8 text-center shadow-[var(--shadow-card)] backdrop-blur-md">
          <p className="text-sm text-[var(--text-secondary)]">
            Format options are seeded during migration. They define available choices for
            date formats, decimal separators, thousands separators, and currency codes
            used in normalization settings dropdowns.
          </p>
        </div>
      )}

      {settingKeys.map((key) => {
        const keyOptions = options
          .filter((o) => o.setting_key === key)
          .sort((a, b) => a.sort_order - b.sort_order);

        return (
          <div key={key}>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              {key} ({keyOptions.length})
            </h3>
            <div className="rounded-[var(--radius-lg)] border border-[var(--border-glass)] bg-[var(--bg-card)] shadow-[var(--shadow-card)] backdrop-blur-md">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-[var(--border-table)] hover:bg-transparent">
                    <TableHead>Value</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keyOptions.map((o) => (
                    <TableRow key={o.id} className="border-b border-[var(--border-table)]/50">
                      <TableCell className="font-mono text-xs">{o.option_value}</TableCell>
                      <TableCell className="text-sm">{o.display_label}</TableCell>
                      <TableCell className="text-xs">{o.region_hint || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={o.is_active ? "default" : "secondary"}>
                          {o.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
