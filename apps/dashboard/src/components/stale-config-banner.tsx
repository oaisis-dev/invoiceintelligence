"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useRouter } from "next/navigation";

type StaleConfigBannerProps = {
  invoiceId: string;
  show: boolean;
};

export function StaleConfigBanner({ invoiceId, show }: StaleConfigBannerProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!show) return null;

  const handleReprocess = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/retry`, {
        method: "POST",
      });
      if (res.ok) {
        router.refresh();
      } else {
        setError("Reprocessing failed. Please try again.");
      }
    } catch {
      setError("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="alert"
      className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
    >
      <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
      <span className="flex-1">
        {error ??
          "This invoice was processed with an older configuration. Reprocessing will apply the latest normalization settings."}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={handleReprocess}
        disabled={loading}
        className="shrink-0"
      >
        <RefreshCw className={`size-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
        Reprocess
      </Button>
    </div>
  );
}
