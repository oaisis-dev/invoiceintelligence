"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { PlatformAdmin, PlatformAdminPermission } from "@/types/database";

const ALL_PERMISSIONS: { value: PlatformAdminPermission; label: string }[] = [
  { value: "read_orgs", label: "Read Orgs" },
  { value: "view_audit_logs", label: "View Audit Logs" },
  { value: "manage_billing", label: "Manage Billing" },
  { value: "manage_plans", label: "Manage Plans" },
  { value: "impersonate", label: "Impersonate" },
  { value: "manage_platform", label: "Manage Platform (Super Admin)" },
];

// -- Add Admin Dialog --

export function AddAdminButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [permissions, setPermissions] = useState<PlatformAdminPermission[]>([
    "read_orgs",
    "view_audit_logs",
  ]);
  const router = useRouter();

  function togglePermission(perm: PlatformAdminPermission) {
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          display_name: displayName || null,
          permissions,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add admin");
      }

      toast.success("Admin added successfully");
      setOpen(false);
      setEmail("");
      setDisplayName("");
      setPermissions(["read_orgs", "view_audit_logs"]);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add admin");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Admin
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Platform Admin</DialogTitle>
            <DialogDescription>
              Add a new platform administrator by their Google account email.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="display-name">Display Name</Label>
              <Input
                id="display-name"
                placeholder="John Doe"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Permissions</Label>
              <div className="flex flex-wrap gap-2">
                {ALL_PERMISSIONS.map((perm) => (
                  <button
                    key={perm.value}
                    type="button"
                    onClick={() => togglePermission(perm.value)}
                    className="cursor-pointer"
                  >
                    <Badge
                      variant={
                        permissions.includes(perm.value)
                          ? "default"
                          : "outline"
                      }
                    >
                      {perm.label}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Admin"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// -- Edit Admin Dialog --

export function EditAdminButton({ admin, currentAdminId }: { admin: PlatformAdmin; currentAdminId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState(admin.display_name ?? "");
  const [permissions, setPermissions] = useState<PlatformAdminPermission[]>(
    admin.permissions
  );
  const router = useRouter();
  const isSelf = admin.id === currentAdminId;

  function togglePermission(perm: PlatformAdminPermission) {
    if (isSelf && perm === "manage_platform") return;
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/admins", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: admin.id,
          display_name: displayName || null,
          permissions,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update admin");
      }

      toast.success("Admin updated successfully");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update admin");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Admin</DialogTitle>
            <DialogDescription>{admin.email}</DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`display-name-${admin.id}`}>Display Name</Label>
              <Input
                id={`display-name-${admin.id}`}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Permissions</Label>
              <div className="flex flex-wrap gap-2">
                {ALL_PERMISSIONS.map((perm) => {
                  const locked = isSelf && perm.value === "manage_platform";
                  return (
                    <button
                      key={perm.value}
                      type="button"
                      onClick={() => togglePermission(perm.value)}
                      className={locked ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
                      disabled={locked}
                    >
                      <Badge
                        variant={
                          permissions.includes(perm.value)
                            ? "default"
                            : "outline"
                        }
                      >
                        {perm.label}
                      </Badge>
                    </button>
                  );
                })}
              </div>
              {isSelf && (
                <p className="text-xs text-[var(--text-secondary)]">
                  You cannot remove &quot;Manage Platform&quot; from yourself.
                </p>
              )}
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// -- Toggle Active / Delete --

export function ToggleActiveButton({
  admin,
  currentAdminId,
}: {
  admin: PlatformAdmin;
  currentAdminId: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const isSelf = admin.id === currentAdminId;

  async function handleToggle() {
    if (isSelf) {
      toast.error("Cannot deactivate your own account");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admins", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: admin.id, is_active: !admin.is_active }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update admin");
      }

      toast.success(
        admin.is_active ? "Admin deactivated" : "Admin activated"
      );
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update admin");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleToggle}
      disabled={loading || isSelf}
      title={isSelf ? "Cannot deactivate yourself" : undefined}
    >
      {loading
        ? "..."
        : admin.is_active
          ? "Deactivate"
          : "Activate"}
    </Button>
  );
}

export function DeleteAdminButton({
  admin,
  currentAdminId,
}: {
  admin: PlatformAdmin;
  currentAdminId: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const isSelf = admin.id === currentAdminId;

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admins?id=${admin.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete admin");
      }

      toast.success("Admin deleted");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete admin");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="text-[var(--error)] hover:bg-[var(--error-10)] hover:text-[var(--error)]"
          disabled={isSelf}
          title={isSelf ? "Cannot delete yourself" : undefined}
        >
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Admin</DialogTitle>
          <DialogDescription>
            Are you sure you want to permanently remove{" "}
            <strong>{admin.email}</strong> as a platform admin? This cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? "Deleting..." : "Delete Admin"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
