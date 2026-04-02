"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import type { InvoiceHistoryEntry } from "@/types/database";
import { formatDateTime } from "@/lib/format";

type InvoiceHistoryTimelineProps = {
  invoiceId: string;
};

function formatActionLabel(action: string): string {
  return action
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function InvoiceHistoryTimeline({ invoiceId }: InvoiceHistoryTimelineProps) {
  const [history, setHistory] = useState<InvoiceHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/invoices/${invoiceId}/history`);
        if (!response.ok) {
          throw new Error(`Failed to load history (${response.status})`);
        }

        const payload = (await response.json()) as {
          history?: InvoiceHistoryEntry[];
        };
        if (!cancelled) {
          setHistory(payload.history ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load history");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadHistory();
    return () => {
      cancelled = true;
    };
  }, [invoiceId]);

  const content = useMemo(() => {
    if (isLoading) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading timeline...
        </div>
      );
    }

    if (error) {
      return <p className="text-sm text-destructive">{error}</p>;
    }

    if (history.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">
          No history yet for this invoice.
        </p>
      );
    }

    return (
      <ul className="space-y-3">
        {history.map((entry) => (
          <li
            key={entry.id}
            className="rounded-md border border-border/70 bg-background/60 p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">
                {formatActionLabel(entry.action)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(entry.created_at)}
              </p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {entry.actor?.display_name ??
                entry.actor?.email ??
                "System"}
            </p>
          </li>
        ))}
      </ul>
    );
  }, [error, history, isLoading]);

  return (
    <section className="rounded-lg border border-border/70 bg-card/60 p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Processing Timeline
      </h2>
      {content}
    </section>
  );
}
