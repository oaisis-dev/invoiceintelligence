"use client";

import { useMemo } from "react";
import { formatCurrency } from "@/lib/format";
import type { InvoiceWithLineItems } from "@/types/database";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CategoriesSheetProps {
  invoice: InvoiceWithLineItems;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CategoriesSheet({ invoice }: CategoriesSheetProps) {
  const { categories, grandTotal } = useMemo(() => {
    const categoryMap = new Map<string, { count: number; amount: number }>();
    for (const li of invoice.line_items) {
      const cat = li.category || "Uncategorized";
      const prev = categoryMap.get(cat) ?? { count: 0, amount: 0 };
      categoryMap.set(cat, {
        count: prev.count + 1,
        amount: prev.amount + (li.extended_price ?? 0),
      });
    }
    const sorted = [...categoryMap.entries()].sort(
      (a, b) => b[1].amount - a[1].amount,
    );
    return {
      categories: sorted,
      grandTotal: sorted.reduce((s, [, v]) => s + v.amount, 0),
    };
  }, [invoice.line_items]);

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-xl space-y-4">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
          Category Breakdown
        </h3>
        <div className="rounded-lg border border-border/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 border-b border-border/50">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                  Category
                </th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">
                  Items
                </th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {categories.map(([cat, { count, amount }]) => (
                <tr key={cat} className="hover:bg-muted/20">
                  <td className="px-4 py-2.5 font-medium">{cat}</td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground">
                    {count}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {formatCurrency(amount)}
                  </td>
                </tr>
              ))}
              <tr className="bg-muted/20 font-semibold">
                <td className="px-4 py-3">Total</td>
                <td className="px-4 py-3 text-right">
                  {invoice.line_items.length}
                </td>
                <td className="px-4 py-3 text-right">
                  {formatCurrency(grandTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
