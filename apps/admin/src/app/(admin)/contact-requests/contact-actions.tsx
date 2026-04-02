"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ContactRequest } from "@/types/database";

export function UpdateStatusButton({
  request,
  targetStatus,
  label,
}: {
  request: ContactRequest;
  targetStatus: "contacted" | "resolved";
  label: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleUpdate() {
    setLoading(true);
    try {
      const res = await fetch("/api/contact-requests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: request.id, status: targetStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update status");
      }

      toast.success(`Marked as ${targetStatus}`);
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update status"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleUpdate}
      disabled={loading}
    >
      {loading ? "..." : label}
    </Button>
  );
}
