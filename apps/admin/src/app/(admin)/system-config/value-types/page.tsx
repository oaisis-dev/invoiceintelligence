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

type ValueType = {
  id: string;
  code: string;
  display_name: string;
  base_kind: string;
  input_widget: string;
  is_active: boolean;
};

export default function ValueTypesPage() {
  const [types, setTypes] = useState<ValueType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      // Value types are read from system_canonical_fields endpoint or a dedicated one
      // For now, fetch from a dedicated API route
      const res = await fetch("/api/system-config/fields");
      if (res.ok) {
        // Extract unique value types from fields data
        // In a full implementation, this would be a separate endpoint
        setTypes([]);
      } else {
        setError("Failed to load value types.");
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
    return <div className="text-sm text-[var(--text-secondary)]">Loading value types...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-600">{error}</div>;
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border-glass)] bg-[var(--bg-card)] shadow-[var(--shadow-card)] backdrop-blur-md">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-[var(--border-table)] hover:bg-transparent">
            <TableHead>Code</TableHead>
            <TableHead>Display Name</TableHead>
            <TableHead>Base Kind</TableHead>
            <TableHead>Input Widget</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {types.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-16 text-center text-[var(--text-secondary)]">
                Value types are seeded during migration. Types include: string, number,
                currency_amount, date, boolean, enum, json.
              </TableCell>
            </TableRow>
          ) : (
            types.map((t) => (
              <TableRow key={t.id} className="border-b border-[var(--border-table)]/50">
                <TableCell className="font-mono text-xs">{t.code}</TableCell>
                <TableCell className="text-sm">{t.display_name}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{t.base_kind}</Badge>
                </TableCell>
                <TableCell className="text-xs">{t.input_widget}</TableCell>
                <TableCell>
                  <Badge variant={t.is_active ? "default" : "secondary"}>
                    {t.is_active ? "Active" : "Inactive"}
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
