"use client";

import { useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfidenceIndicator } from "@/components/confidence-indicator";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardContent,
} from "@/components/ui/glass-card";
import type { Invoice } from "@/types/database";

interface InvoiceMetadataFormProps {
  invoice: Invoice;
  onChange: (updates: Partial<Invoice>) => void;
}

type EditableField = {
  key: keyof Invoice;
  label: string;
  type: "text" | "number" | "date";
  confidenceKey: string;
};

const EDITABLE_FIELDS: EditableField[] = [
  { key: "vendor_name", label: "Vendor Name", type: "text", confidenceKey: "vendor_name" },
  { key: "invoice_number", label: "Invoice Number", type: "text", confidenceKey: "invoice_number" },
  { key: "invoice_date", label: "Invoice Date", type: "date", confidenceKey: "invoice_date" },
  { key: "total_amount", label: "Total Amount", type: "number", confidenceKey: "total_amount" },
];

function getConfidence(
  scores: Record<string, unknown> | null,
  key: string
): number | null {
  if (!scores) return null;
  const value = scores[key];
  if (typeof value === "number") return value;
  return null;
}

function formatFieldValue(value: unknown, type: string): string {
  if (value == null) return "";
  if (type === "date" && typeof value === "string") {
    // Convert ISO date string to YYYY-MM-DD for date input
    const dateOnly = value.split("T")[0];
    return dateOnly ?? "";
  }
  return String(value);
}

export function InvoiceMetadataForm({ invoice, onChange }: InvoiceMetadataFormProps) {
  const handleFieldChange = useCallback(
    (field: EditableField, value: string) => {
      if (field.type === "number") {
        onChange({ [field.key]: value ? parseFloat(value) : null } as Partial<Invoice>);
        return;
      }
      onChange({ [field.key]: value || null } as Partial<Invoice>);
    },
    [onChange]
  );

  return (
    <GlassCard>
      <GlassCardHeader>
        <h3 className="text-base font-semibold text-foreground">
          Invoice Details
        </h3>
      </GlassCardHeader>
      <GlassCardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {EDITABLE_FIELDS.map((field) => {
            const confidence = getConfidence(
              invoice.confidence_scores,
              field.confidenceKey
            );

            return (
              <div key={field.key} className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <Label htmlFor={`field-${field.key}`}>{field.label}</Label>
                  {confidence !== null && (
                    <ConfidenceIndicator
                      confidence={confidence}
                      showLabel
                    />
                  )}
                </div>
                <Input
                  id={`field-${field.key}`}
                  type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                  step={field.type === "number" ? "0.01" : undefined}
                  value={formatFieldValue(invoice[field.key], field.type)}
                  onChange={(e) => handleFieldChange(field, e.target.value)}
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                />
              </div>
            );
          })}
        </div>
      </GlassCardContent>
    </GlassCard>
  );
}
