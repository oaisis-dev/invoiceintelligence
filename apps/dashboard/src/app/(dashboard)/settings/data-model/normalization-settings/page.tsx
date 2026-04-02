"use client";

import { useEffect, useState, useCallback, useTransition } from "react";
import { GlassCard, GlassCardContent, GlassCardHeader } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const API_BASE = "/api/settings/data-model/normalization-settings";

type NormalizationSetting = {
  id: string;
  org_id: string;
  setting_key: string;
  value: string;
  vendor_name_pattern: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const SETTING_KEYS = [
  { key: "currency_code", label: "Currency Code", placeholder: "USD" },
  { key: "date_input_format", label: "Date Format", placeholder: "MM/DD/YYYY" },
  { key: "decimal_separator", label: "Decimal Separator", placeholder: "." },
  { key: "thousands_separator", label: "Thousands Separator", placeholder: "," },
] as const;

const SETTING_KEY_LABELS: Record<string, string> = Object.fromEntries(
  SETTING_KEYS.map((s) => [s.key, s.label])
);

type FormData = {
  setting_key: string;
  value: string;
  vendor_name_pattern: string;
};

const emptyForm: FormData = {
  setting_key: "",
  value: "",
  vendor_name_pattern: "",
};

export default function NormalizationSettingsPage() {
  const [defaults, setDefaults] = useState<NormalizationSetting[]>([]);
  const [overrides, setOverrides] = useState<NormalizationSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"default" | "override">("default");
  const [editingSetting, setEditingSetting] = useState<NormalizationSetting | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [deleteSetting, setDeleteSetting] = useState<NormalizationSetting | null>(null);
  const [isPending, startTransition] = useTransition();

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(API_BASE);
      if (!res.ok) {
        setError("Failed to load normalization settings.");
        return;
      }
      const all: NormalizationSetting[] = await res.json();
      setDefaults(all.filter((s) => s.vendor_name_pattern == null));
      setOverrides(all.filter((s) => s.vendor_name_pattern != null));
    } catch {
      setError("Failed to connect to the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function openCreateDialog(mode: "default" | "override") {
    setEditingSetting(null);
    setDialogMode(mode);
    setFormData(emptyForm);
    setDialogOpen(true);
  }

  function openEditDialog(setting: NormalizationSetting) {
    setEditingSetting(setting);
    setDialogMode(setting.vendor_name_pattern ? "override" : "default");
    setFormData({
      setting_key: setting.setting_key,
      value: setting.value,
      vendor_name_pattern: setting.vendor_name_pattern ?? "",
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!formData.setting_key || !formData.value.trim()) {
      toast.error("Setting key and value are required.");
      return;
    }
    if (dialogMode === "override" && !formData.vendor_name_pattern.trim()) {
      toast.error("Vendor name pattern is required for overrides.");
      return;
    }

    startTransition(async () => {
      try {
        if (editingSetting) {
          const res = await fetch(`${API_BASE}/${editingSetting.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ value: formData.value.trim() }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => null);
            toast.error(data?.error?.message ?? data?.detail ?? "Failed to update setting.");
            return;
          }
          toast.success("Setting updated.");
        } else {
          const body: Record<string, string> = {
            setting_key: formData.setting_key,
            value: formData.value.trim(),
          };
          if (dialogMode === "override") {
            body.vendor_name_pattern = formData.vendor_name_pattern.trim();
          }
          const res = await fetch(API_BASE, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => null);
            toast.error(data?.error?.message ?? data?.detail ?? "Failed to create setting.");
            return;
          }
          toast.success("Setting created.");
        }
        setDialogOpen(false);
        await fetchData();
      } catch {
        toast.error("Request failed. Please try again.");
      }
    });
  }

  function handleDelete() {
    if (!deleteSetting) return;

    startTransition(async () => {
      try {
        const res = await fetch(`${API_BASE}/${deleteSetting.id}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          toast.error(data?.error?.message ?? data?.detail ?? "Failed to delete setting.");
          return;
        }
        toast.success("Setting deleted.");
        setDeleteSetting(null);
        await fetchData();
      } catch {
        toast.error("Request failed. Please try again.");
      }
    });
  }

  if (loading) {
    return <div className="text-sm text-[var(--text-secondary)]">Loading settings...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-600">{error}</div>;
  }

  // Determine which setting keys are already configured as defaults
  const configuredDefaultKeys = new Set(defaults.map((s) => s.setting_key));

  return (
    <div className="space-y-6">
      {/* Org Defaults (Tier 2) */}
      <GlassCard>
        <GlassCardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-medium">Org Defaults</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Default parsing settings applied to all invoices for your organization.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openCreateDialog("default")}
              disabled={configuredDefaultKeys.size >= SETTING_KEYS.length}
            >
              <Plus className="size-4 mr-1" /> Add Default
            </Button>
          </div>
        </GlassCardHeader>
        <GlassCardContent>
          {defaults.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)] py-4 text-center">
              No org defaults configured. System defaults will be used.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Setting</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {defaults.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-sm font-medium">
                      {SETTING_KEY_LABELS[s.setting_key] ?? s.setting_key}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{s.value}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => openEditDialog(s)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => setDeleteSetting(s)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </GlassCardContent>
      </GlassCard>

      {/* Vendor Overrides (Tier 3) */}
      <GlassCard>
        <GlassCardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-medium">Vendor Overrides</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Per-vendor parsing overrides. These take priority over org defaults.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => openCreateDialog("override")}>
              <Plus className="size-4 mr-1" /> Add Override
            </Button>
          </div>
        </GlassCardHeader>
        <GlassCardContent>
          {overrides.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)] py-4 text-center">
              No vendor overrides configured. Org defaults will apply to all vendors.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor Pattern</TableHead>
                  <TableHead>Setting</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {overrides.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-sm">
                      {s.vendor_name_pattern}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {SETTING_KEY_LABELS[s.setting_key] ?? s.setting_key}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{s.value}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => openEditDialog(s)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => setDeleteSetting(s)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </GlassCardContent>
      </GlassCard>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSetting
                ? "Edit Setting"
                : dialogMode === "default"
                  ? "Add Org Default"
                  : "Add Vendor Override"}
            </DialogTitle>
            <DialogDescription>
              {editingSetting
                ? "Update the value for this normalization setting."
                : dialogMode === "default"
                  ? "Set a default parsing value for your organization."
                  : "Set a vendor-specific parsing override."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {dialogMode === "override" && !editingSetting && (
              <div className="space-y-2">
                <Label htmlFor="vendor_pattern">Vendor Name Pattern</Label>
                <Input
                  id="vendor_pattern"
                  placeholder="e.g. Sysco, US Foods"
                  value={formData.vendor_name_pattern}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, vendor_name_pattern: e.target.value }))
                  }
                />
              </div>
            )}
            {!editingSetting && (
              <div className="space-y-2">
                <Label htmlFor="setting_key">Setting</Label>
                <Select
                  value={formData.setting_key}
                  onValueChange={(v) => setFormData((f) => ({ ...f, setting_key: v }))}
                >
                  <SelectTrigger id="setting_key">
                    <SelectValue placeholder="Select a setting..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SETTING_KEYS.filter(
                      (sk) =>
                        dialogMode === "override" || !configuredDefaultKeys.has(sk.key)
                    ).map((sk) => (
                      <SelectItem key={sk.key} value={sk.key}>
                        {sk.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="value">Value</Label>
              <Input
                id="value"
                placeholder={
                  SETTING_KEYS.find((sk) => sk.key === formData.setting_key)?.placeholder ??
                  "Enter value..."
                }
                value={formData.value}
                onChange={(e) => setFormData((f) => ({ ...f, value: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {editingSetting ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteSetting}
        onOpenChange={(open) => !open && setDeleteSetting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Setting</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the{" "}
              <strong>
                {SETTING_KEY_LABELS[deleteSetting?.setting_key ?? ""] ??
                  deleteSetting?.setting_key}
              </strong>{" "}
              setting
              {deleteSetting?.vendor_name_pattern
                ? ` for vendor "${deleteSetting.vendor_name_pattern}"`
                : ""}
              ? This will revert to system defaults.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isPending}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
