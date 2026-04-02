"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type OverviewStats = {
  fields: number;
  mappings: number;
  categories: number;
  rules: number;
  pending_term_recs: number;
  pending_category_recs: number;
};

export default function SystemConfigOverviewPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [fieldsRes, mappingsRes, categoriesRes, rulesRes, termRecsRes, catRecsRes] =
          await Promise.all([
            fetch("/api/system-config/fields"),
            fetch("/api/system-config/mappings"),
            fetch("/api/system-config/categories"),
            fetch("/api/system-config/rules"),
            fetch("/api/system-config/recommendations/terms"),
            fetch("/api/system-config/recommendations/categories"),
          ]);

        const fields = fieldsRes.ok ? await fieldsRes.json() : [];
        const mappings = mappingsRes.ok ? await mappingsRes.json() : [];
        const categories = categoriesRes.ok ? await categoriesRes.json() : [];
        const rules = rulesRes.ok ? await rulesRes.json() : [];
        const termRecs = termRecsRes.ok ? await termRecsRes.json() : [];
        const catRecs = catRecsRes.ok ? await catRecsRes.json() : [];

        setStats({
          fields: Array.isArray(fields) ? fields.length : 0,
          mappings: Array.isArray(mappings) ? mappings.length : 0,
          categories: Array.isArray(categories) ? categories.length : 0,
          rules: Array.isArray(rules) ? rules.length : 0,
          pending_term_recs: Array.isArray(termRecs) ? termRecs.length : 0,
          pending_category_recs: Array.isArray(catRecs) ? catRecs.length : 0,
        });
      } catch {
        setStats(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <div className="text-sm text-[var(--text-secondary)]">Loading overview...</div>;
  }

  if (!stats) {
    return <div className="text-sm text-red-600">Failed to load system config overview.</div>;
  }

  const rows = [
    { label: "Canonical Fields", value: stats.fields, href: "/system-config/fields" },
    { label: "Term Mappings", value: stats.mappings, href: "/system-config/mappings" },
    { label: "Categories", value: stats.categories, href: "/system-config/categories" },
    { label: "Category Rules", value: stats.rules, href: "/system-config/categories" },
    {
      label: "Pending Term Recommendations",
      value: stats.pending_term_recs,
      href: "/system-config/recommendations",
    },
    {
      label: "Pending Category Recommendations",
      value: stats.pending_category_recs,
      href: "/system-config/recommendations",
    },
  ];

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border-glass)] bg-[var(--bg-card)] shadow-[var(--shadow-card)] backdrop-blur-md">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-[var(--border-table)] hover:bg-transparent">
            <TableHead>Resource</TableHead>
            <TableHead className="text-right">Count</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.label} className="border-b border-[var(--border-table)]/50">
              <TableCell>
                <Link
                  href={row.href}
                  className="text-sm font-medium text-[var(--primary)] hover:underline"
                >
                  {row.label}
                </Link>
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {row.value}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
