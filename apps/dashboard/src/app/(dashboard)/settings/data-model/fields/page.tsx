"use client";

import { useEffect, useState, useCallback } from "react";
import { GlassCard, GlassCardContent, GlassCardHeader } from "@/components/ui/glass-card";
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
import { Plus, Eye, EyeOff, FileOutput } from "lucide-react";

type Field = {
  id: string;
  section_type: string;
  field_key: string;
  display_name: string;
  value_type_id: string;
  source_system_field_id?: string | null;
  is_required: boolean;
  show_in_review: boolean;
  show_in_export: boolean;
  sort_order: number;
  is_active: boolean;
};

type SystemField = {
  id: string;
  section_type: string;
  field_key: string;
  display_name: string;
  value_type_id: string;
  is_active: boolean;
};

export default function FieldsPage() {
  const [orgFields, setOrgFields] = useState<Field[]>([]);
  const [systemFields, setSystemFields] = useState<SystemField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFields = useCallback(async () => {
    try {
      setError(null);
      const [orgRes, sysRes] = await Promise.all([
        fetch("/api/settings/data-model/fields"),
        fetch("/api/settings/data-model/fields/system"),
      ]);
      if (orgRes.ok) setOrgFields(await orgRes.json());
      if (sysRes.ok) setSystemFields(await sysRes.json());
      if (!orgRes.ok && !sysRes.ok) {
        setError("Failed to load fields. Please try again.");
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

  if (loading) {
    return <div className="text-sm text-[var(--text-secondary)]">Loading fields...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-600">{error}</div>;
  }

  // Fields that have been customized at org level
  const orgFieldKeys = new Set(orgFields.map((f) => f.field_key));
  // System fields not yet customized by this org
  const inheritedFields = systemFields.filter(
    (sf) => !orgFieldKeys.has(sf.field_key) || orgFields.some((of) => of.source_system_field_id === sf.id)
  );

  const groupedOrgFields = groupBySection(orgFields);
  const sections = ["header", "line_item", "summary"];

  return (
    <div className="space-y-6">
      {sections.map((section) => {
        const sectionOrgFields = groupedOrgFields[section] || [];
        const sectionSysFields = inheritedFields.filter((f) => f.section_type === section);

        if (sectionOrgFields.length === 0 && sectionSysFields.length === 0) return null;

        return (
          <GlassCard key={section}>
            <GlassCardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-medium capitalize">{section.replace("_", " ")} Fields</h3>
                <Button variant="outline" size="sm">
                  <Plus className="size-4 mr-1" /> Add Field
                </Button>
              </div>
            </GlassCardHeader>
            <GlassCardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Field Key</TableHead>
                    <TableHead>Display Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-center">Review</TableHead>
                    <TableHead className="text-center">Export</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sectionSysFields
                    .filter((sf) => !orgFieldKeys.has(sf.field_key))
                    .map((f) => (
                      <TableRow key={f.id} className="text-[var(--text-secondary)]">
                        <TableCell className="font-mono text-xs">{f.field_key}</TableCell>
                        <TableCell>{f.display_name}</TableCell>
                        <TableCell className="text-xs">{f.value_type_id}</TableCell>
                        <TableCell className="text-center">
                          <Eye className="size-4 mx-auto text-[var(--text-secondary)]/50" />
                        </TableCell>
                        <TableCell className="text-center">
                          <FileOutput className="size-4 mx-auto text-[var(--text-secondary)]/50" />
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">System</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">Inherited</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  {sectionOrgFields.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-mono text-xs">{f.field_key}</TableCell>
                      <TableCell>{f.display_name}</TableCell>
                      <TableCell className="text-xs">{f.value_type_id}</TableCell>
                      <TableCell className="text-center">
                        {f.show_in_review ? (
                          <Eye className="size-4 mx-auto text-green-600" />
                        ) : (
                          <EyeOff className="size-4 mx-auto text-[var(--text-secondary)]/50" />
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {f.show_in_export ? (
                          <FileOutput className="size-4 mx-auto text-green-600" />
                        ) : (
                          <FileOutput className="size-4 mx-auto text-[var(--text-secondary)]/50" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={f.source_system_field_id ? "secondary" : "default"}>
                          {f.source_system_field_id ? "Customized" : "Custom"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={f.is_active ? "outline" : "destructive"}>
                          {f.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </GlassCardContent>
          </GlassCard>
        );
      })}
    </div>
  );
}

function groupBySection<T extends { section_type: string }>(items: T[]): Record<string, T[]> {
  return items.reduce(
    (acc, item) => {
      const key = item.section_type;
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    },
    {} as Record<string, T[]>
  );
}
