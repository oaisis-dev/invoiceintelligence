"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUpgradeCheckout } from "@/hooks/use-upgrade-checkout";

export function LimitReachedDialog({
  open,
  onOpenChange,
  message,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message?: string;
}) {
  const { startUpgrade, loading } = useUpgradeCheckout();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload limit reached</DialogTitle>
          <DialogDescription>
            {message ??
              "You've reached your monthly invoice limit. Upgrade your plan to continue uploading invoices."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={startUpgrade} disabled={loading}>
            {loading ? "Redirecting..." : "Upgrade Plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
