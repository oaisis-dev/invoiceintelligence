"use client";

import { useCallback, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardContent,
} from "@/components/ui/glass-card";
import { useGridNavigation } from "@/hooks/use-grid-navigation";
import { formatCurrency } from "@/lib/format";
import type { InvoiceCharges } from "@/lib/mismatch";
import type { InvoiceLineItem } from "@/types/database";

interface LineItemsGridProps {
  invoiceId: string;
  lineItems: InvoiceLineItem[];
  onChange: (items: InvoiceLineItem[]) => void;
  charges?: InvoiceCharges;
}

type EditableField =
  | "quantity"
  | "description"
  | "unit_price"
  | "extended_price"
  | "tax_amount"
  | "category"
  | "account";

const COLUMNS: {
  field: EditableField;
  label: string;
  type: "number" | "text";
  step?: string;
}[] = [
  { field: "quantity", label: "Qty", type: "number", step: "0.001" },
  { field: "description", label: "Description", type: "text" },
  { field: "unit_price", label: "Unit Price", type: "number", step: "0.01" },
  { field: "extended_price", label: "Ext. Price", type: "number", step: "0.01" },
  { field: "tax_amount", label: "Tax", type: "number", step: "0.01" },
  { field: "category", label: "Category", type: "text" },
  { field: "account", label: "Account", type: "number" },
];

function isNumericField(field: EditableField): boolean {
  return field === "quantity" || field === "unit_price" || field === "extended_price" || field === "tax_amount" || field === "account";
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

// --- Sortable Row ---

interface SortableRowProps {
  item: InvoiceLineItem;
  rowIndex: number;
  onFieldChange: (rowIndex: number, field: EditableField, value: string) => void;
  onDelete: (rowIndex: number) => void;
  registerRef: (row: number, col: number) => (el: HTMLInputElement | null) => void;
  onKeyDown: (row: number, col: number, e: React.KeyboardEvent<HTMLInputElement>) => void;
}

function SortableRow({
  item,
  rowIndex,
  onFieldChange,
  onDelete,
  registerRef,
  onKeyDown,
}: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="grid grid-cols-[28px_60px_1fr_90px_90px_70px_100px_70px_32px] items-center gap-px border-b border-border/40 bg-background hover:bg-muted/30"
    >
      {/* Drag handle */}
      <div
        className="flex h-full cursor-grab items-center justify-center text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing"
        aria-label={`Reorder row ${item.sort_order}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-3.5" />
      </div>

      {/* Editable cells */}
      {COLUMNS.map((col, colIndex) => {
        const rawValue = item[col.field];
        const displayValue = rawValue != null ? String(rawValue) : "";

        return (
          <Input
            key={col.field}
            ref={registerRef(rowIndex, colIndex)}
            type={col.type}
            step={col.step}
            value={displayValue}
            onChange={(e) => onFieldChange(rowIndex, col.field, e.target.value)}
            onKeyDown={(e) => onKeyDown(rowIndex, colIndex, e)}
            placeholder={col.label}
            aria-label={`${col.label} for row ${item.sort_order}`}
            className={`h-8 rounded-none border-0 bg-transparent text-xs shadow-none focus:bg-background focus:ring-1 focus:ring-ring ${
              col.type === "number" ? "text-right" : ""
            } ${col.field === "description" ? "font-medium" : ""}`}
          />
        );
      })}

      {/* Delete button */}
      <div className="flex items-center justify-center">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => onDelete(rowIndex)}
          aria-label={`Delete row ${item.sort_order}`}
          className="text-muted-foreground/50 hover:text-destructive"
        >
          <Trash2 className="size-3" />
        </Button>
      </div>
    </div>
  );
}

// --- Main Grid ---

export function LineItemsGrid({ invoiceId, lineItems, onChange, charges }: LineItemsGridProps) {
  const addRow = useCallback(() => {
    const maxSort = lineItems.reduce((max, it) => Math.max(max, it.sort_order), 0);
    const newItem = createEmptyLineItem(invoiceId, maxSort + 1);
    onChange([...lineItems, newItem]);
  }, [invoiceId, lineItems, onChange]);

  const deleteRow = useCallback(
    (rowIndex: number) => {
      const updated = lineItems.filter((_, i) => i !== rowIndex);
      const renumbered = updated.map((it, i) => ({ ...it, sort_order: i + 1 }));
      onChange(renumbered);
    },
    [lineItems, onChange]
  );

  const handleFieldChange = useCallback(
    (rowIndex: number, field: EditableField, value: string) => {
      const item = lineItems[rowIndex];
      if (!item) return;

      const updatedItem = { ...item };
      if (isNumericField(field)) {
        const parsed = value ? parseFloat(value) : NaN;
        (updatedItem as Record<string, unknown>)[field] = Number.isNaN(parsed) ? null : parsed;
      } else {
        (updatedItem as Record<string, unknown>)[field] = value || null;
      }

      const updated = lineItems.map((it, i) => (i === rowIndex ? updatedItem : it));
      onChange(updated);
    },
    [lineItems, onChange]
  );

  const { registerRef, handleKeyDown } = useGridNavigation({
    rowCount: lineItems.length,
    colCount: COLUMNS.length,
    onAddRow: addRow,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = lineItems.findIndex((it) => it.id === active.id);
      const newIndex = lineItems.findIndex((it) => it.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = [...lineItems];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved!);
      const renumbered = reordered.map((it, i) => ({ ...it, sort_order: i + 1 }));
      onChange(renumbered);
    },
    [lineItems, onChange]
  );

  // --- Totals ---
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
      <GlassCardContent className="p-0">
        {lineItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <p className="text-sm font-medium">No line items</p>
            <p className="text-xs">Click &quot;Add Row&quot; to add line items manually.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Header row */}
            <div className="grid grid-cols-[28px_60px_1fr_90px_90px_70px_100px_70px_32px] items-center gap-px border-b-2 border-border/60 bg-muted/40 px-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <div />
              {COLUMNS.map((col) => (
                <div
                  key={col.field}
                  className={`px-2 py-2 ${col.type === "number" ? "text-right" : ""}`}
                >
                  {col.label}
                </div>
              ))}
              <div />
            </div>

            {/* Sortable rows */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={lineItems.map((it) => it.id)}
                strategy={verticalListSortingStrategy}
              >
                {lineItems.map((item, rowIndex) => (
                  <SortableRow
                    key={item.id}
                    item={item}
                    rowIndex={rowIndex}
                    onFieldChange={handleFieldChange}
                    onDelete={deleteRow}
                    registerRef={registerRef}
                    onKeyDown={handleKeyDown}
                  />
                ))}
              </SortableContext>
            </DndContext>

            {/* Footer totals */}
            <div className="border-t-2 border-border/60 bg-muted/20">
              {hasExtraCharges && (
                <>
                  <div className="grid grid-cols-[28px_60px_1fr_90px_90px_70px_100px_70px_32px] items-center gap-px px-0 text-xs text-muted-foreground">
                    <div className="col-span-5" />
                    <div className="px-2 py-1.5 text-right">Subtotal</div>
                    <div className="px-2 py-1.5 text-right">
                      {formatCurrency(lineSubtotal + (hasLineTax ? lineTax : 0))}
                    </div>
                    <div className="col-span-2" />
                  </div>
                  {!hasLineTax && c.tax > 0 && (
                    <div className="grid grid-cols-[28px_60px_1fr_90px_90px_70px_100px_70px_32px] items-center gap-px px-0 text-xs text-muted-foreground">
                      <div className="col-span-5" />
                      <div className="px-2 py-1 text-right">Tax</div>
                      <div className="px-2 py-1 text-right">{formatCurrency(c.tax)}</div>
                      <div className="col-span-2" />
                    </div>
                  )}
                  {c.freight > 0 && (
                    <div className="grid grid-cols-[28px_60px_1fr_90px_90px_70px_100px_70px_32px] items-center gap-px px-0 text-xs text-muted-foreground">
                      <div className="col-span-5" />
                      <div className="px-2 py-1 text-right">Freight</div>
                      <div className="px-2 py-1 text-right">{formatCurrency(c.freight)}</div>
                      <div className="col-span-2" />
                    </div>
                  )}
                  {c.shipping > 0 && (
                    <div className="grid grid-cols-[28px_60px_1fr_90px_90px_70px_100px_70px_32px] items-center gap-px px-0 text-xs text-muted-foreground">
                      <div className="col-span-5" />
                      <div className="px-2 py-1 text-right">Shipping</div>
                      <div className="px-2 py-1 text-right">{formatCurrency(c.shipping)}</div>
                      <div className="col-span-2" />
                    </div>
                  )}
                  {c.discount > 0 && (
                    <div className="grid grid-cols-[28px_60px_1fr_90px_90px_70px_100px_70px_32px] items-center gap-px px-0 text-xs text-muted-foreground">
                      <div className="col-span-5" />
                      <div className="px-2 py-1 text-right">Discount</div>
                      <div className="px-2 py-1 text-right">{formatCurrency(-c.discount)}</div>
                      <div className="col-span-2" />
                    </div>
                  )}
                </>
              )}
              <div className="grid grid-cols-[28px_60px_1fr_90px_90px_70px_100px_70px_32px] items-center gap-px border-t border-border/40 px-0 font-semibold">
                <div className="col-span-5" />
                <div className="px-2 py-2 text-right text-sm">Total</div>
                <div className="px-2 py-2 text-right text-sm">{formatCurrency(computedTotal)}</div>
                <div className="col-span-2" />
              </div>
            </div>
          </div>
        )}
      </GlassCardContent>
    </GlassCard>
  );
}
