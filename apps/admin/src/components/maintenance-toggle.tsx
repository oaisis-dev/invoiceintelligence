"use client";

import { useCallback, useEffect, useState } from "react";
import { Wrench, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type MaintenanceStatus = {
  enabled: boolean;
  maintenancePercent: number;
};

export function MaintenanceToggle() {
  const [status, setStatus] = useState<MaintenanceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<boolean>(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/maintenance");
      if (!res.ok) throw new Error("Failed to fetch");
      const data: MaintenanceStatus = await res.json();
      setStatus(data);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  function handleToggleClick(enable: boolean) {
    setPendingAction(enable);
    setConfirmOpen(true);
  }

  async function handleConfirm() {
    setConfirmOpen(false);
    setToggling(true);

    try {
      const res = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: pendingAction }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      const data: MaintenanceStatus = await res.json();
      setStatus(data);
      toast.success(
        data.enabled
          ? "Maintenance mode enabled — client app is showing the maintenance page"
          : "Maintenance mode disabled — client app is live"
      );
    } catch (error) {
      toast.error(
        `Failed to toggle maintenance mode: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setToggling(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--border-glass)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)] backdrop-blur-md">
        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <Loader2 className="size-4 animate-spin" />
          Loading maintenance status...
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--border-glass)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)] backdrop-blur-md">
        <div className="flex items-center justify-between">
          <p className="text-sm text-red-600">
            Unable to fetch maintenance status. The maintenance tagged revision
            may not be deployed yet, or the service account lacks permissions.
          </p>
          <Button variant="outline" size="sm" onClick={fetchStatus}>
            <RefreshCw className="size-3.5" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-[var(--radius-lg)] border border-[var(--border-glass)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)] backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-[var(--primary-10)]">
              <Wrench className="size-5 text-[var(--primary)]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  Maintenance Mode
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                    status.enabled
                      ? "bg-red-100 text-red-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  <span
                    className={`size-1.5 rounded-full ${
                      status.enabled ? "bg-red-500" : "bg-green-500"
                    }`}
                  />
                  {status.enabled ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                {status.enabled
                  ? "All client app traffic is being redirected to the maintenance page."
                  : "Client app is serving normally to all users."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={fetchStatus}
              disabled={toggling}
              title="Refresh status"
            >
              <RefreshCw className="size-3.5" />
            </Button>
            <Button
              variant={status.enabled ? "default" : "destructive"}
              size="sm"
              onClick={() => handleToggleClick(!status.enabled)}
              disabled={toggling}
            >
              {toggling && <Loader2 className="size-3.5 animate-spin" />}
              {status.enabled ? "Disable" : "Enable"}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingAction
                ? "Enable Maintenance Mode?"
                : "Disable Maintenance Mode?"}
            </DialogTitle>
            <DialogDescription>
              {pendingAction
                ? "This will immediately redirect all client app traffic to the maintenance page. Users will not be able to access the application until maintenance mode is disabled."
                : "This will restore normal traffic to the client app. Users will be able to access the application again."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={pendingAction ? "destructive" : "default"}
              onClick={handleConfirm}
            >
              {pendingAction ? "Enable Maintenance" : "Disable Maintenance"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
