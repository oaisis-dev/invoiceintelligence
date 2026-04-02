"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BackButtonProps {
  fallbackHref?: string;
}

export function BackButton({ fallbackHref = "/invoices" }: BackButtonProps) {
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Back to invoices"
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push(fallbackHref);
        }
      }}
    >
      <ArrowLeft className="size-4" />
    </Button>
  );
}
