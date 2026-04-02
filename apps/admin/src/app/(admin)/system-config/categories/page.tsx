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

type SystemCategory = {
  id: string;
  code: string;
  display_name: string;
  description: string | null;
  default_account: string | null;
  default_sub_account: string | null;
  sort_order: number;
  is_active: boolean;
};

type SystemRule = {
  id: string;
  category_id: string;
  match_mode: string;
  match_source: string;
  match_value: string;
  vendor_name_pattern: string | null;
  priority: number;
  is_active: boolean;
};

export default function SystemCategoriesPage() {
  const [categories, setCategories] = useState<SystemCategory[]>([]);
  const [rules, setRules] = useState<SystemRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [catRes, ruleRes] = await Promise.all([
        fetch("/api/system-config/categories"),
        fetch("/api/system-config/rules"),
      ]);
      if (catRes.ok) setCategories(await catRes.json());
      if (ruleRes.ok) setRules(await ruleRes.json());
      if (!catRes.ok && !ruleRes.ok) setError("Failed to load data.");
    } catch {
      setError("Failed to connect to the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleCategoryActive = async (cat: SystemCategory) => {
    try {
      const res = await fetch("/api/system-config/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cat.id, is_active: !cat.is_active }),
      });
      if (res.ok) {
        setCategories((prev) =>
          prev.map((c) => (c.id === cat.id ? { ...c, is_active: !c.is_active } : c))
        );
      }
    } catch {
      setError("Failed to update category.");
    }
  };

  if (loading) {
    return <div className="text-sm text-[var(--text-secondary)]">Loading categories...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-8">
      {/* Categories */}
      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
          Categories ({categories.length})
        </h3>
        <div className="rounded-[var(--radius-lg)] border border-[var(--border-glass)] bg-[var(--bg-card)] shadow-[var(--shadow-card)] backdrop-blur-md">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[var(--border-table)] hover:bg-transparent">
                <TableHead>Code</TableHead>
                <TableHead>Display Name</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Sub-Account</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-16 text-center text-[var(--text-secondary)]">
                    No system categories configured.
                  </TableCell>
                </TableRow>
              ) : (
                categories
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((c) => (
                    <TableRow key={c.id} className="border-b border-[var(--border-table)]/50">
                      <TableCell className="font-mono text-xs">{c.code}</TableCell>
                      <TableCell className="text-sm">{c.display_name}</TableCell>
                      <TableCell className="text-xs">{c.default_account || "-"}</TableCell>
                      <TableCell className="text-xs">{c.default_sub_account || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={c.is_active ? "default" : "secondary"}>
                          {c.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleCategoryActive(c)}
                        >
                          {c.is_active ? "Deactivate" : "Activate"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Category Rules */}
      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
          Category Rules ({rules.length})
        </h3>
        <div className="rounded-[var(--radius-lg)] border border-[var(--border-glass)] bg-[var(--bg-card)] shadow-[var(--shadow-card)] backdrop-blur-md">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[var(--border-table)] hover:bg-transparent">
                <TableHead>Match Value</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Vendor Pattern</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-16 text-center text-[var(--text-secondary)]">
                    No system category rules configured.
                  </TableCell>
                </TableRow>
              ) : (
                rules.map((r) => (
                  <TableRow key={r.id} className="border-b border-[var(--border-table)]/50">
                    <TableCell className="font-mono text-xs">{r.match_value}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{r.match_mode}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{r.match_source}</TableCell>
                    <TableCell className="text-xs">{r.vendor_name_pattern || "Any"}</TableCell>
                    <TableCell className="text-xs">{r.priority}</TableCell>
                    <TableCell>
                      <Badge variant={r.is_active ? "default" : "secondary"}>
                        {r.is_active ? "Active" : "Inactive"}
                      </Badge>
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
