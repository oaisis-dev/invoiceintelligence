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
import { Check, X } from "lucide-react";

type TermRecommendation = {
  id: string;
  raw_label: string;
  section_type: string;
  vendor_name?: string | null;
  suggested_field_key?: string | null;
  occurrence_count: number;
  sample_invoice_id?: string | null;
  status: string;
  source: string;
  recommendation_type: string;
  context?: Record<string, unknown>;
};

type CategoryRecommendation = {
  id: string;
  raw_description: string;
  vendor_name?: string | null;
  suggested_category_code?: string | null;
  occurrence_count: number;
  sample_invoice_id?: string | null;
  status: string;
  source: string;
  context?: Record<string, unknown>;
};

export default function SuggestionsPage() {
  const [termRecs, setTermRecs] = useState<TermRecommendation[]>([]);
  const [catRecs, setCatRecs] = useState<CategoryRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [termRes, catRes] = await Promise.all([
        fetch("/api/settings/data-model/suggestions/terms"),
        fetch("/api/settings/data-model/suggestions/categories"),
      ]);
      if (termRes.ok) setTermRecs(await termRes.json());
      if (catRes.ok) setCatRecs(await catRes.json());
      if (!termRes.ok && !catRes.ok) {
        setError("Failed to load suggestions. Please try again.");
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

  const handleDismissTerm = async (recId: string) => {
    try {
      const res = await fetch(`/api/settings/data-model/suggestions/terms/${recId}/dismiss`, {
        method: "POST",
      });
      if (res.ok) {
        setTermRecs((prev) => prev.filter((r) => r.id !== recId));
      } else {
        setError("Failed to dismiss suggestion.");
      }
    } catch {
      setError("Failed to connect to the server.");
    }
  };

  const handleResolveTerm = async (rec: TermRecommendation) => {
    try {
      const res = await fetch(`/api/settings/data-model/suggestions/terms/${rec.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mapping_id: rec.id,
          raw_label: rec.raw_label,
          section_type: rec.section_type,
          suggested_field_key: rec.suggested_field_key ?? "",
          vendor_name_pattern: rec.vendor_name ?? null,
        }),
      });
      if (res.ok) {
        setTermRecs((prev) => prev.filter((r) => r.id !== rec.id));
      } else {
        setError("Failed to resolve suggestion.");
      }
    } catch {
      setError("Failed to connect to the server.");
    }
  };

  const handleDismissCategory = async (recId: string) => {
    try {
      const res = await fetch(
        `/api/settings/data-model/suggestions/categories/${recId}/dismiss`,
        { method: "POST" }
      );
      if (res.ok) {
        setCatRecs((prev) => prev.filter((r) => r.id !== recId));
      } else {
        setError("Failed to dismiss suggestion.");
      }
    } catch {
      setError("Failed to connect to the server.");
    }
  };

  const handleResolveCategory = async (rec: CategoryRecommendation) => {
    try {
      const res = await fetch(`/api/settings/data-model/suggestions/categories/${rec.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rule_id: rec.id,
          raw_description: rec.raw_description,
          suggested_category_code: rec.suggested_category_code ?? "",
          vendor_name_pattern: rec.vendor_name ?? null,
        }),
      });
      if (res.ok) {
        setCatRecs((prev) => prev.filter((r) => r.id !== rec.id));
      } else {
        setError("Failed to resolve suggestion.");
      }
    } catch {
      setError("Failed to connect to the server.");
    }
  };

  if (loading) {
    return <div className="text-sm text-[var(--text-secondary)]">Loading suggestions...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-600">{error}</div>;
  }

  const pipelineTerms = termRecs.filter((r) => r.source === "pipeline");
  const correctionTerms = termRecs.filter((r) => r.source === "reviewer_correction");
  const totalPending = termRecs.length + catRecs.length;

  return (
    <div className="space-y-6">
      {totalPending === 0 && (
        <GlassCard>
          <GlassCardContent className="py-8 text-center">
            <p className="text-sm text-[var(--text-secondary)]">
              No pending suggestions. Suggestions appear when the pipeline encounters unresolved
              labels or reviewers make corrections.
            </p>
          </GlassCardContent>
        </GlassCard>
      )}

      {pipelineTerms.length > 0 && (
        <GlassCard>
          <GlassCardHeader>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-medium">Unresolved Labels</h3>
              <Badge variant="secondary">{pipelineTerms.length}</Badge>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Raw labels from processed invoices that could not be mapped to canonical fields.
            </p>
          </GlassCardHeader>
          <GlassCardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Raw Label</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Count</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pipelineTerms.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.raw_label}</TableCell>
                    <TableCell className="text-xs">{r.section_type}</TableCell>
                    <TableCell className="text-xs">{r.vendor_name || "Any"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{r.recommendation_type}</Badge>
                    </TableCell>
                    <TableCell>{r.occurrence_count}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => handleResolveTerm(r)}
                        >
                          <Check className="size-3 mr-1" /> Map
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleDismissTerm(r.id)}
                        >
                          <X className="size-3 mr-1" /> Dismiss
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </GlassCardContent>
        </GlassCard>
      )}

      {correctionTerms.length > 0 && (
        <GlassCard>
          <GlassCardHeader>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-medium">Reviewer Corrections</h3>
              <Badge variant="secondary">{correctionTerms.length}</Badge>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Corrections made during invoice review, pending admin approval.
            </p>
          </GlassCardHeader>
          <GlassCardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Raw Label</TableHead>
                  <TableHead>Suggested Field</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {correctionTerms.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.raw_label}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {r.suggested_field_key || "-"}
                    </TableCell>
                    <TableCell className="text-xs">{r.vendor_name || "Any"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{r.recommendation_type}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => handleResolveTerm(r)}
                        >
                          <Check className="size-3 mr-1" /> Approve
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleDismissTerm(r.id)}
                        >
                          <X className="size-3 mr-1" /> Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </GlassCardContent>
        </GlassCard>
      )}

      {catRecs.length > 0 && (
        <GlassCard>
          <GlassCardHeader>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-medium">Category Suggestions</h3>
              <Badge variant="secondary">{catRecs.length}</Badge>
            </div>
          </GlassCardHeader>
          <GlassCardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Suggested Category</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Count</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {catRecs.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs max-w-[200px] truncate">
                      {r.raw_description}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {r.suggested_category_code || "-"}
                    </TableCell>
                    <TableCell className="text-xs">{r.vendor_name || "Any"}</TableCell>
                    <TableCell>{r.occurrence_count}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => handleResolveCategory(r)}
                        >
                          <Check className="size-3 mr-1" /> Approve
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleDismissCategory(r.id)}
                        >
                          <X className="size-3 mr-1" /> Dismiss
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </GlassCardContent>
        </GlassCard>
      )}
    </div>
  );
}
