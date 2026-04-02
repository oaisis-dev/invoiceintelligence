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
import { Plus } from "lucide-react";

type Mapping = {
  id: string;
  org_id: string;
  canonical_field_id: string;
  section_type: string;
  match_mode: string;
  match_value: string;
  vendor_name_pattern?: string | null;
  priority: number;
  is_active: boolean;
  is_ignored: boolean;
  cast_options?: Record<string, unknown>;
  source: string;
};

type CategoryRule = {
  id: string;
  org_id: string;
  category_id: string;
  match_mode: string;
  match_source: string;
  match_value: string;
  vendor_name_pattern?: string | null;
  priority: number;
  is_active: boolean;
  source: string;
};

export default function MappingsPage() {
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [rules, setRules] = useState<CategoryRule[]>([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [mapRes, ruleRes] = await Promise.all([
        fetch("/api/settings/data-model/mappings"),
        fetch("/api/settings/data-model/category-rules"),
      ]);
      if (mapRes.ok) setMappings(await mapRes.json());
      if (ruleRes.ok) setRules(await ruleRes.json());
      if (!mapRes.ok && !ruleRes.ok) {
        setError("Failed to load mappings. Please try again.");
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
    return <div className="text-sm text-[var(--text-secondary)]">Loading mappings...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <GlassCard>
        <GlassCardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-base font-medium">Term Mappings</h3>
            <Button variant="outline" size="sm">
              <Plus className="size-4 mr-1" /> Add Mapping
            </Button>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Map raw invoice labels to canonical fields.
          </p>
        </GlassCardHeader>
        <GlassCardContent>
          {mappings.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)] py-4 text-center">
              No term mappings configured. System defaults are active.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Match Value</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Target Field</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono text-xs">{m.match_value}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{m.match_mode}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{m.section_type}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {m.canonical_field_id}
                    </TableCell>
                    <TableCell className="text-xs">
                      {m.vendor_name_pattern || "All"}
                    </TableCell>
                    <TableCell>{m.priority}</TableCell>
                    <TableCell>
                      {m.is_ignored ? (
                        <Badge variant="destructive">Ignored</Badge>
                      ) : (
                        <Badge variant={m.is_active ? "outline" : "destructive"}>
                          {m.is_active ? "Active" : "Inactive"}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </GlassCardContent>
      </GlassCard>

      <GlassCard>
        <GlassCardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-base font-medium">Category Rules</h3>
            <Button variant="outline" size="sm">
              <Plus className="size-4 mr-1" /> Add Rule
            </Button>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Assign categories to line items based on matching rules.
          </p>
        </GlassCardHeader>
        <GlassCardContent>
          {rules.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)] py-4 text-center">
              No category rules configured. LLM classification is used as default.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Match Value</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.match_value}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{r.match_mode}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{r.match_source}</TableCell>
                    <TableCell className="font-mono text-xs">{r.category_id}</TableCell>
                    <TableCell className="text-xs">
                      {r.vendor_name_pattern || "All"}
                    </TableCell>
                    <TableCell>{r.priority}</TableCell>
                    <TableCell>
                      <Badge variant={r.is_active ? "outline" : "destructive"}>
                        {r.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </GlassCardContent>
      </GlassCard>
    </div>
  );
}
