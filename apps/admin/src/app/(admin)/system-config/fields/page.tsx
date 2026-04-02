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

type SystemField = {
  id: string;
  section_type: string;
  field_key: string;
  display_name: string;
  value_type_id: string | null;
  is_required: boolean;
  show_in_review: boolean;
  show_in_export: boolean;
  sort_order: number;
  is_active: boolean;
};

export default function SystemFieldsPage() {
  const [fields, setFields] = useState<SystemField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFields = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/system-config/fields");
      if (res.ok) {
        setFields(await res.json());
      } else {
        setError("Failed to load fields.");
      }
    } catch {
      setError("Failed to connect to the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  const toggleActive = async (field: SystemField) => {
    try {
      const res = await fetch("/api/system-config/fields", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: field.id, is_active: !field.is_active }),
      });
      if (res.ok) {
        setFields((prev) =>
          prev.map((f) => (f.id === field.id ? { ...f, is_active: !f.is_active } : f))
        );
      }
    } catch {
      setError("Failed to update field.");
    }
  };

  if (loading) {
    return <div className="text-sm text-[var(--text-secondary)]">Loading fields...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-600">{error}</div>;
  }

  const sections = [...new Set(fields.map((f) => f.section_type))].sort();

  return (
    <div className="space-y-6">
      {sections.map((section) => {
        const sectionFields = fields
          .filter((f) => f.section_type === section)
          .sort((a, b) => a.sort_order - b.sort_order);

        return (
          <div key={section}>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              {section} ({sectionFields.length})
            </h3>
            <div className="rounded-[var(--radius-lg)] border border-[var(--border-glass)] bg-[var(--bg-card)] shadow-[var(--shadow-card)] backdrop-blur-md">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-[var(--border-table)] hover:bg-transparent">
                    <TableHead>Field Key</TableHead>
                    <TableHead>Display Name</TableHead>
                    <TableHead>Required</TableHead>
                    <TableHead>Review</TableHead>
                    <TableHead>Export</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sectionFields.map((f) => (
                    <TableRow key={f.id} className="border-b border-[var(--border-table)]/50">
                      <TableCell className="font-mono text-xs">{f.field_key}</TableCell>
                      <TableCell className="text-sm">{f.display_name}</TableCell>
                      <TableCell>
                        {f.is_required ? (
                          <Badge variant="default">Yes</Badge>
                        ) : (
                          <span className="text-xs text-[var(--text-secondary)]">No</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {f.show_in_review ? "Yes" : "No"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {f.show_in_export ? "Yes" : "No"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={f.is_active ? "default" : "secondary"}>
                          {f.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleActive(f)}
                        >
                          {f.is_active ? "Deactivate" : "Activate"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        );
      })}

      {fields.length === 0 && (
        <div className="py-8 text-center text-sm text-[var(--text-secondary)]">
          No system canonical fields configured.
        </div>
      )}
    </div>
  );
}
