"use client";

import { useCallback, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardContent,
} from "@/components/ui/glass-card";
import { formatCurrency } from "@/lib/format";
import type { InvoiceCharges } from "@/lib/mismatch";
import type { InvoiceLineItem } from "@/types/database";

interface LineItemsTableProps {
  invoiceId: string;
  lineItems: InvoiceLineItem[];
  onChange: (items: InvoiceLineItem[]) => void;
  charges?: InvoiceCharges;
}

type EditableLineItemField =
  | "quantity"
  | "description"
  | "unit_price"
  | "extended_price"
  | "tax_amount"
  | "category"
  | "account";

interface EditingCell {
  rowIndex: number;
  field: EditableLineItemField;
}

function getCellDisplayValue(
  item: InvoiceLineItem,
  field: EditableLineItemField
): string {
  const value = item[field];
  if (value == null) return "";
  if (field === "unit_price" || field === "extended_price" || field === "tax_amount") {
    return formatCurrency(value as number);
  }
  return String(value);
}

function getCellRawValue(
  item: InvoiceLineItem,
  field: EditableLineItemField
): string {
  const value = item[field];
  if (value == null) return "";
  return String(value);
}

function createEmptyLineItem(invoiceId: string, sortOrder: number): InvoiceLineItem {
  return {
    id: `new-${Date.now()}-${sortOrder}`,
    invoice_id: invoiceId,
    sort_order: sortOrder,
    quantity: null,
    size: null,
    unit: null,
    description: null,
    item_code: null,
    unit_price: null,
    extended_price: null,
    tax_amount: null,
    category: null,
    account: null,
    sub_account: null,
    extra: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function LineItemsTable({ invoiceId, lineItems, onChange, charges }: LineItemsTableProps) {
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  const startEditing = useCallback(
    (rowIndex: number, field: EditableLineItemField) => {
      const rawValue = getCellRawValue(lineItems[rowIndex]!, field);
      setEditingCell({ rowIndex, field });
      setEditValue(rawValue);
    },
    [lineItems]
  );

  const commitEdit = useCallback(() => {
    if (!editingCell) return;

    const { rowIndex, field } = editingCell;
    const item = lineItems[rowIndex];
    if (!item) return;

    const updatedItem = { ...item };

    if (field === "quantity" || field === "unit_price" || field === "extended_price" || field === "tax_amount" || field === "account") {
      const parsed = editValue ? parseFloat(editValue) : null;
      (updatedItem as Record<string, unknown>)[field] = parsed;
    } else {
      (updatedItem as Record<string, unknown>)[field] = editValue || null;
    }

    const updated = lineItems.map((it, i) => (i === rowIndex ? updatedItem : it));
    onChange(updated);
    setEditingCell(null);
    setEditValue("");
  }, [editingCell, editValue, lineItems, onChange]);

  const cancelEdit = useCallback(() => {
    setEditingCell(null);
    setEditValue("");
  }, []);

  const handleCellKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commitEdit();
      } else if (e.key === "Escape") {
        cancelEdit();
      }
    },
    [commitEdit, cancelEdit]
  );

  const addRow = useCallback(() => {
    const maxSort = lineItems.reduce((max, it) => Math.max(max, it.sort_order), 0);
    const newItem = createEmptyLineItem(invoiceId, maxSort + 1);
    onChange([...lineItems, newItem]);
  }, [invoiceId, lineItems, onChange]);

  const deleteRow = useCallback(
    (rowIndex: number) => {
      const updated = lineItems.filter((_, i) => i !== rowIndex);
      // Recompute sort_order
      const renumbered = updated.map((it, i) => ({
        ...it,
        sort_order: i + 1,
      }));
      onChange(renumbered);
    },
    [lineItems, onChange]
  );

  const lineSubtotal = useMemo(
    () => lineItems.reduce((s, item) => s + (item.extended_price ?? 0), 0),
    [lineItems]
  );
  const lineTax = useMemo(
    () => lineItems.reduce((s, item) => s + (item.tax_amount ?? 0), 0),
    [lineItems]
  );
  const hasLineTax = useMemo(
    () => lineItems.some((item) => item.tax_amount != null),
    [lineItems]
  );

  const c = charges ?? { tax: 0, freight: 0, shipping: 0, discount: 0 };
  const tax = hasLineTax ? lineTax : c.tax;
  const computedTotal = Math.round(
    (lineSubtotal + tax + c.freight + c.shipping - c.discount) * 100
  ) / 100;

  const hasExtraCharges =
    c.freight > 0 || c.shipping > 0 || c.discount > 0 || (!hasLineTax && c.tax > 0);

  const columns: { field: EditableLineItemField; label: string; align: "left" | "right"; width: string }[] = [
    { field: "quantity", label: "Qty", align: "right", width: "w-16" },
    { field: "description", label: "Description", align: "left", width: "min-w-[180px]" },
    { field: "unit_price", label: "Unit Price", align: "right", width: "w-24" },
    { field: "extended_price", label: "Ext. Price", align: "right", width: "w-24" },
    { field: "tax_amount", label: "Tax", align: "right", width: "w-20" },
    { field: "category", label: "Category", align: "left", width: "w-28" },
    { field: "account", label: "Account", align: "right", width: "w-20" },
  ];

  return (
    <GlassCard>
      <GlassCardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">
            Line Items
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({lineItems.length})
            </span>
          </h3>
          <Button variant="outline" size="sm" onClick={addRow}>
            <Plus className="size-4" />
            Add Row
          </Button>
        </div>
      </GlassCardHeader>
      <GlassCardContent>
        {lineItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <p className="text-sm font-medium">No line items</p>
            <p className="text-xs">Click &quot;Add Row&quot; to add line items manually.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                {columns.map((col) => (
                  <TableHead
                    key={col.field}
                    className={`${col.width} ${col.align === "right" ? "text-right" : ""}`}
                  >
                    {col.label}
                  </TableHead>
                ))}
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineItems.map((item, rowIndex) => (
                <TableRow key={item.id}>
                  <TableCell className="text-muted-foreground">
                    {item.sort_order}
                  </TableCell>
                  {columns.map((col) => {
                    const isEditing =
                      editingCell?.rowIndex === rowIndex &&
                      editingCell?.field === col.field;

                    return (
                      <TableCell
                        key={col.field}
                        className={`${col.width} ${col.align === "right" ? "text-right" : ""} cursor-pointer`}
                        onClick={() => {
                          if (!isEditing) {
                            startEditing(rowIndex, col.field);
                          }
                        }}
                      >
                        {isEditing ? (
                          <Input
                            type={
                              col.field === "quantity" ||
                              col.field === "unit_price" ||
                              col.field === "extended_price" ||
                              col.field === "tax_amount" ||
                              col.field === "account"
                                ? "number"
                                : "text"
                            }
                            step={
                              col.field === "unit_price" || col.field === "extended_price" || col.field === "tax_amount"
                                ? "0.01"
                                : col.field === "quantity"
                                  ? "0.001"
                                  : undefined
                            }
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={commitEdit}
                            onKeyDown={handleCellKeyDown}
                            className="h-7 text-xs"
                            autoFocus
                          />
                        ) : (
                          <span className="text-sm">
                            {getCellDisplayValue(item, col.field) || (
                              <span className="text-muted-foreground/50">--</span>
                            )}
                          </span>
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => deleteRow(rowIndex)}
                      aria-label={`Delete row ${item.sort_order}`}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              {hasExtraCharges && (
                <>
                  <TableRow>
                    <TableCell colSpan={5} className="text-right text-xs text-muted-foreground">
                      Subtotal
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {formatCurrency(lineSubtotal + (hasLineTax ? lineTax : 0))}
                    </TableCell>
                    <TableCell colSpan={3} />
                  </TableRow>
                  {!hasLineTax && c.tax > 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-right text-xs text-muted-foreground">
                        Tax
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {formatCurrency(c.tax)}
                      </TableCell>
                      <TableCell colSpan={3} />
                    </TableRow>
                  )}
                  {c.freight > 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-right text-xs text-muted-foreground">
                        Freight
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {formatCurrency(c.freight)}
                      </TableCell>
                      <TableCell colSpan={3} />
                    </TableRow>
                  )}
                  {c.shipping > 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-right text-xs text-muted-foreground">
                        Shipping
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {formatCurrency(c.shipping)}
                      </TableCell>
                      <TableCell colSpan={3} />
                    </TableRow>
                  )}
                  {c.discount > 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-right text-xs text-muted-foreground">
                        Discount
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {formatCurrency(-c.discount)}
                      </TableCell>
                      <TableCell colSpan={3} />
                    </TableRow>
                  )}
                </>
              )}
              <TableRow>
                <TableCell colSpan={5} className="text-right font-semibold">
                  Total
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(computedTotal)}
                </TableCell>
                <TableCell colSpan={3} />
              </TableRow>
            </TableFooter>
          </Table>
        )}
      </GlassCardContent>
    </GlassCard>
  );
}
