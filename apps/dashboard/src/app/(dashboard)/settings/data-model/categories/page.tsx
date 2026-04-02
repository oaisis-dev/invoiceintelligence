"use client";

import { useEffect, useState, useCallback, useTransition } from "react";
import { GlassCard, GlassCardContent, GlassCardHeader } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Category = {
  id: string;
  org_id: string;
  code: string;
  display_name: string;
  source_system_category_id?: string | null;
  description?: string | null;
  default_account?: number | null;
  default_sub_account?: number | null;
  sort_order: number;
  is_active: boolean;
};

type SystemCategory = {
  id: string;
  code: string;
  display_name: string;
  description?: string | null;
  default_account?: number | null;
  default_sub_account?: number | null;
  is_active: boolean;
};

type CategoryFormData = {
  code: string;
  display_name: string;
  description: string;
  default_account: string;
  default_sub_account: string;
};

const emptyForm: CategoryFormData = {
  code: "",
  display_name: "",
  description: "",
  default_account: "",
  default_sub_account: "",
};

export default function CategoriesPage() {
  const [orgCategories, setOrgCategories] = useState<Category[]>([]);
  const [systemCategories, setSystemCategories] = useState<SystemCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>(emptyForm);
  const [deleteCategory, setDeleteCategory] = useState<Category | null>(null);
  const [isPending, startTransition] = useTransition();

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [orgRes, sysRes] = await Promise.all([
        fetch("/api/settings/data-model/categories"),
        fetch("/api/settings/data-model/categories/system"),
      ]);
      if (orgRes.ok) setOrgCategories(await orgRes.json());
      if (sysRes.ok) setSystemCategories(await sysRes.json());
      if (!orgRes.ok && !sysRes.ok) {
        setError("Failed to load categories. Please try again.");
      }
    } catch {
      setError("Failed to connect to the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function openCreateDialog() {
    setEditingCategory(null);
    setFormData(emptyForm);
    setDialogOpen(true);
  }

  function openEditDialog(category: Category) {
    setEditingCategory(category);
    setFormData({
      code: category.code,
      display_name: category.display_name,
      description: category.description ?? "",
      default_account: category.default_account?.toString() ?? "",
      default_sub_account: category.default_sub_account?.toString() ?? "",
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!formData.code.trim() || !formData.display_name.trim()) {
      toast.error("Code and display name are required.");
      return;
    }

    startTransition(async () => {
      const body: Record<string, unknown> = {
        code: formData.code.trim(),
        display_name: formData.display_name.trim(),
        description: formData.description.trim() || null,
        default_account: formData.default_account ? Number(formData.default_account) : null,
        default_sub_account: formData.default_sub_account
          ? Number(formData.default_sub_account)
          : null,
      };

      try {
        if (editingCategory) {
          const res = await fetch(
            `/api/settings/data-model/categories/${editingCategory.id}`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            }
          );
          if (!res.ok) {
            const data = await res.json();
            toast.error(data?.error?.message ?? "Failed to update category.");
            return;
          }
          toast.success("Category updated.");
        } else {
          const res = await fetch("/api/settings/data-model/categories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          if (!res.ok) {
            const data = await res.json();
            toast.error(data?.error?.message ?? "Failed to create category.");
            return;
          }
          toast.success("Category created.");
        }
        setDialogOpen(false);
        await fetchData();
      } catch {
        toast.error("Request failed. Please try again.");
      }
    });
  }

  function handleDelete() {
    if (!deleteCategory) return;

    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/settings/data-model/categories/${deleteCategory.id}`,
          { method: "DELETE" }
        );
        if (!res.ok) {
          const data = await res.json();
          toast.error(data?.error?.message ?? "Failed to delete category.");
          return;
        }
        toast.success("Category deleted.");
        setDeleteCategory(null);
        await fetchData();
      } catch {
        toast.error("Request failed. Please try again.");
      }
    });
  }

  if (loading) {
    return <div className="text-sm text-[var(--text-secondary)]">Loading categories...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-600">{error}</div>;
  }

  const orgCodes = new Set(orgCategories.map((c) => c.code));
  const inheritedCategories = systemCategories.filter((sc) => !orgCodes.has(sc.code));

  return (
    <div className="space-y-6">
      <GlassCard>
        <GlassCardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-base font-medium">Categories</h3>
            <Button variant="outline" size="sm" onClick={openCreateDialog}>
              <Plus className="size-4 mr-1" /> Add Category
            </Button>
          </div>
        </GlassCardHeader>
        <GlassCardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Display Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Sub-Account</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {inheritedCategories.map((c) => (
                <TableRow key={c.id} className="text-[var(--text-secondary)]">
                  <TableCell className="font-mono text-xs">{c.code}</TableCell>
                  <TableCell>{c.display_name}</TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate">
                    {c.description || "-"}
                  </TableCell>
                  <TableCell>{c.default_account ?? "-"}</TableCell>
                  <TableCell>{c.default_sub_account ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">System</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">Inherited</Badge>
                  </TableCell>
                  <TableCell />
                </TableRow>
              ))}
              {orgCategories.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs">{c.code}</TableCell>
                  <TableCell>{c.display_name}</TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate">
                    {c.description || "-"}
                  </TableCell>
                  <TableCell>{c.default_account ?? "-"}</TableCell>
                  <TableCell>{c.default_sub_account ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant={c.source_system_category_id ? "secondary" : "default"}>
                      {c.source_system_category_id ? "Customized" : "Custom"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.is_active ? "outline" : "destructive"}>
                      {c.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => openEditDialog(c)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => setDeleteCategory(c)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </GlassCardContent>
      </GlassCard>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Edit Category" : "Add Category"}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? "Update this category's details and GL account mapping."
                : "Create a new category with optional GL account mapping."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                placeholder="e.g. COS-SEAFOOD"
                value={formData.code}
                onChange={(e) => setFormData((f) => ({ ...f, code: e.target.value }))}
                disabled={!!editingCategory}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="display_name">Display Name</Label>
              <Input
                id="display_name"
                placeholder="e.g. Seafood"
                value={formData.display_name}
                onChange={(e) => setFormData((f) => ({ ...f, display_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Optional description"
                value={formData.description}
                onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="default_account">GL Account</Label>
                <Input
                  id="default_account"
                  type="number"
                  placeholder="e.g. 5100"
                  value={formData.default_account}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, default_account: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="default_sub_account">Sub-Account</Label>
                <Input
                  id="default_sub_account"
                  type="number"
                  placeholder="e.g. 10"
                  value={formData.default_sub_account}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, default_sub_account: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {editingCategory ? "Update Category" : "Create Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteCategory} onOpenChange={(open) => !open && setDeleteCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{deleteCategory?.display_name}&rdquo; (
              {deleteCategory?.code})? This action cannot be undone.
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
