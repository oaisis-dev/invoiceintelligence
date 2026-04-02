"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SystemMapping = {
  id: string;
  canonical_field_id: string;
  section_type: string;
  match_mode: string;
  match_value: string;
  vendor_name_pattern: string | null;
  priority: number;
  is_active: boolean;
  is_ignored: boolean;
};

export default function SystemMappingsPage() {
  const [mappings, setMappings] = useState<SystemMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/system-config/mappings");
      if (res.ok) {
        setMappings(await res.json());
      } else {
        setError("Failed to load mappings.");
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

  const toggleActive = async (mapping: SystemMapping) => {
    try {
      const res = await fetch("/api/system-config/mappings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: mapping.id, is_active: !mapping.is_active }),
      });
      if (res.ok) {
        setMappings((prev) =>
          prev.map((m) => (m.id === mapping.id ? { ...m, is_active: !m.is_active } : m))
        );
      }
    } catch {
      setError("Failed to update mapping.");
    }
  };

  if (loading) {
    return <div className="text-sm text-[var(--text-secondary)]">Loading mappings...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-600">{error}</div>;
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border-glass)] bg-[var(--bg-card)] shadow-[var(--shadow-card)] backdrop-blur-md">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-[var(--border-table)] hover:bg-transparent">
            <TableHead>Match Value</TableHead>
            <TableHead>Mode</TableHead>
            <TableHead>Section</TableHead>
            <TableHead>Vendor Pattern</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mappings.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-16 text-center text-[var(--text-secondary)]">
                No system term mappings configured.
              </TableCell>
            </TableRow>
          ) : (
            mappings.map((m) => (
              <TableRow key={m.id} className="border-b border-[var(--border-table)]/50">
                <TableCell className="font-mono text-xs">{m.match_value}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{m.match_mode}</Badge>
                </TableCell>
                <TableCell className="text-xs">{m.section_type}</TableCell>
                <TableCell className="text-xs">{m.vendor_name_pattern || "Any"}</TableCell>
                <TableCell className="text-xs">{m.priority}</TableCell>
                <TableCell>
                  <Badge variant={m.is_active ? "default" : "secondary"}>
                    {m.is_ignored ? "Ignored" : m.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => toggleActive(m)}>
                    {m.is_active ? "Deactivate" : "Activate"}
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
