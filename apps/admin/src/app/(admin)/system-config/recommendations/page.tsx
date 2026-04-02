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
import { Check, X } from "lucide-react";

type TermRecommendation = {
  id: string;
  raw_label: string;
  section_type: string;
  vendor_name_pattern: string | null;
  suggested_field_key: string | null;
  org_count: number;
  total_occurrences: number;
  status: string;
};

type CategoryRecommendation = {
  id: string;
  raw_description: string;
  vendor_name_pattern: string | null;
  suggested_category_code: string | null;
  org_count: number;
  total_occurrences: number;
  status: string;
};

export default function SystemRecommendationsPage() {
  const [termRecs, setTermRecs] = useState<TermRecommendation[]>([]);
  const [catRecs, setCatRecs] = useState<CategoryRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [termRes, catRes] = await Promise.all([
        fetch("/api/system-config/recommendations/terms"),
        fetch("/api/system-config/recommendations/categories"),
      ]);
      if (termRes.ok) setTermRecs(await termRes.json());
      if (catRes.ok) setCatRecs(await catRes.json());
      if (!termRes.ok && !catRes.ok) {
        setError("Failed to load recommendations.");
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

  const handlePromoteTerm = async (rec: TermRecommendation) => {
    try {
      const res = await fetch(`/api/system-config/recommendations/terms/${rec.id}/promote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promoted_to_id: null }),
      });
      if (res.ok) {
        setTermRecs((prev) => prev.filter((r) => r.id !== rec.id));
      } else {
        setError("Failed to promote recommendation.");
      }
    } catch {
      setError("Failed to connect to the server.");
    }
  };

  const handleDismissTerm = async (recId: string) => {
    try {
      const res = await fetch(`/api/system-config/recommendations/terms/${recId}/dismiss`, {
        method: "POST",
      });
      if (res.ok) {
        setTermRecs((prev) => prev.filter((r) => r.id !== recId));
      } else {
        setError("Failed to dismiss recommendation.");
      }
    } catch {
      setError("Failed to connect to the server.");
    }
  };

  const handlePromoteCategory = async (rec: CategoryRecommendation) => {
    try {
      const res = await fetch(`/api/system-config/recommendations/categories/${rec.id}/promote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promoted_to_id: null }),
      });
      if (res.ok) {
        setCatRecs((prev) => prev.filter((r) => r.id !== rec.id));
      } else {
        setError("Failed to promote recommendation.");
      }
    } catch {
      setError("Failed to connect to the server.");
    }
  };

  const handleDismissCategory = async (recId: string) => {
    try {
      const res = await fetch(`/api/system-config/recommendations/categories/${recId}/dismiss`, {
        method: "POST",
      });
      if (res.ok) {
        setCatRecs((prev) => prev.filter((r) => r.id !== recId));
      } else {
        setError("Failed to dismiss recommendation.");
      }
    } catch {
      setError("Failed to connect to the server.");
    }
  };

  if (loading) {
    return (
      <div className="text-sm text-[var(--text-secondary)]">Loading recommendations...</div>
    );
  }

  if (error) {
    return <div className="text-sm text-red-600">{error}</div>;
  }

  const totalPending = termRecs.length + catRecs.length;

  return (
    <div className="space-y-8">
      {totalPending === 0 && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--border-glass)] bg-[var(--bg-card)] p-8 text-center shadow-[var(--shadow-card)] backdrop-blur-md">
          <p className="text-sm text-[var(--text-secondary)]">
            No pending system recommendations. Recommendations appear when org admins approve
            corrections or the pipeline encounters cross-org unresolved patterns.
          </p>
        </div>
      )}

      {termRecs.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Term Mappings
            </h3>
            <Badge variant="secondary">{termRecs.length} pending</Badge>
          </div>
          <div className="rounded-[var(--radius-lg)] border border-[var(--border-glass)] bg-[var(--bg-card)] shadow-[var(--shadow-card)] backdrop-blur-md">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[var(--border-table)] hover:bg-transparent">
                  <TableHead>Raw Label</TableHead>
                  <TableHead>Suggested Field</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Orgs</TableHead>
                  <TableHead>Occurrences</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {termRecs.map((r) => (
                  <TableRow key={r.id} className="border-b border-[var(--border-table)]/50">
                    <TableCell className="font-mono text-xs">{r.raw_label}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {r.suggested_field_key || "-"}
                    </TableCell>
                    <TableCell className="text-xs">{r.section_type}</TableCell>
                    <TableCell className="text-xs">
                      {r.vendor_name_pattern || "Any"}
                    </TableCell>
                    <TableCell className="text-xs">{r.org_count}</TableCell>
                    <TableCell className="text-xs">{r.total_occurrences}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePromoteTerm(r)}
                        >
                          <Check className="mr-1 size-3" /> Promote
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDismissTerm(r.id)}
                        >
                          <X className="mr-1 size-3" /> Dismiss
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {catRecs.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Categories
            </h3>
            <Badge variant="secondary">{catRecs.length} pending</Badge>
          </div>
          <div className="rounded-[var(--radius-lg)] border border-[var(--border-glass)] bg-[var(--bg-card)] shadow-[var(--shadow-card)] backdrop-blur-md">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[var(--border-table)] hover:bg-transparent">
                  <TableHead>Description</TableHead>
                  <TableHead>Suggested Category</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Orgs</TableHead>
                  <TableHead>Occurrences</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {catRecs.map((r) => (
                  <TableRow key={r.id} className="border-b border-[var(--border-table)]/50">
                    <TableCell className="max-w-[200px] truncate text-xs">
                      {r.raw_description}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {r.suggested_category_code || "-"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {r.vendor_name_pattern || "Any"}
                    </TableCell>
                    <TableCell className="text-xs">{r.org_count}</TableCell>
                    <TableCell className="text-xs">{r.total_occurrences}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePromoteCategory(r)}
                        >
                          <Check className="mr-1 size-3" /> Promote
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDismissCategory(r.id)}
                        >
                          <X className="mr-1 size-3" /> Dismiss
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}
    </div>
  );
}
