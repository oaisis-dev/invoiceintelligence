"use client";

import { useCallback, useState, useTransition } from "react";
import { Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateOrgSettings } from "@/lib/api-client";
import { parseOrgSettings } from "@/lib/settings/export-routing";
import type { Organization } from "@/types/database";
import type { SettingsLocation } from "@/lib/queries/settings";

// ---------------------------------------------------------------------------
// Reusable field wrapper
// ---------------------------------------------------------------------------

function Field({
  label,
  htmlFor,
  description,
  children,
}: {
  label: string;
  htmlFor?: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div data-slot="field" className="flex flex-col gap-1.5">
      <Label
        htmlFor={htmlFor ?? label}
        className="text-sm font-medium text-[var(--text-primary)]"
      >
        {label}
      </Label>
      {description && (
        <p className="text-xs text-[var(--text-secondary)]">{description}</p>
      )}
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main form
// ---------------------------------------------------------------------------

interface SettingsFormProps {
  org: Organization | null;
  locations: SettingsLocation[];
}

export function SettingsForm({ org, locations }: SettingsFormProps) {
  const [isPending, startTransition] = useTransition();

  // Form state
  const [name, setName] = useState(org?.name ?? "");
  const settings = parseOrgSettings((org?.settings ?? {}) as Record<string, unknown>);
  const [exportFormat, setExportFormat] = useState<"xlsx" | "csv">(
    settings.default_export_format
  );
  const [threshold, setThreshold] = useState(
    String(settings.auto_approve_threshold)
  );
  const [routingMode, setRoutingMode] = useState(settings.export_routing.mode);
  const [orgDefaultDestination, setOrgDefaultDestination] = useState(
    settings.export_routing.org_default_destination
  );
  const [locationOverrides, setLocationOverrides] = useState<Record<string, string>>(
    settings.export_routing.location_overrides
  );

  const activeLocations = locations.filter((location) => location.is_active);

  const updateLocationOverride = useCallback((locationId: string, value: string) => {
    setLocationOverrides((prev) => ({
      ...prev,
      [locationId]: value,
    }));
  }, []);

  function handleSave() {
    const thresholdNum = Number(threshold);
    if (isNaN(thresholdNum) || thresholdNum < 0 || thresholdNum > 100) {
      toast.error("Auto-approve threshold must be between 0 and 100");
      return;
    }
    if (!orgDefaultDestination.trim()) {
      toast.error("Organization default destination is required");
      return;
    }

    startTransition(async () => {
      try {
        const sanitizedLocationOverrides = Object.entries(locationOverrides).reduce<
          Record<string, string>
        >((acc, [locationId, destination]) => {
          const trimmed = destination.trim();
          if (trimmed) {
            acc[locationId] = trimmed;
          }
          return acc;
        }, {});

        await updateOrgSettings({
          name: name.trim() || undefined,
          settings: {
            ...(org?.settings ?? {}),
            default_export_format: exportFormat,
            auto_approve_threshold: thresholdNum,
            export_routing: {
              mode: routingMode,
              org_default_destination: orgDefaultDestination.trim(),
              location_overrides: sanitizedLocationOverrides,
            },
          },
        });
        toast.success("Settings saved successfully");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to save settings";
        toast.error(message);
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* Organization Information */}
      <GlassCard className="p-[25px]">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] tracking-tight mb-4">
          Organization Information
        </h2>
        <div className="space-y-4">
          <Field label="Organization Name" htmlFor="org-name">
            <Input
              id="org-name"
              name="organization_name"
              autoComplete="organization"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your organization name"
              className="h-9 rounded-[var(--radius-sm)] border-[var(--border-input)] bg-white px-3 text-sm"
            />
          </Field>
        </div>
      </GlassCard>

      {/* Export & Processing */}
      <GlassCard className="p-[25px]">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] tracking-tight mb-4">
          Export &amp; Processing
        </h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Default Export Format"
              htmlFor="export-format"
              description="Format used when exporting approved invoices"
            >
              <Select
                value={exportFormat}
                onValueChange={(value: "xlsx" | "csv") =>
                  setExportFormat(value)
                }
              >
                <SelectTrigger
                  id="export-format"
                  className="h-9 rounded-[var(--radius-sm)] border-[var(--border-input)] bg-white text-[var(--text-primary)]"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                  <SelectItem value="csv">CSV (.csv)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field
              label="Auto-Approve Threshold (%)"
              htmlFor="auto-approve"
              description="Invoices with confidence above this threshold are auto-approved"
            >
              <Input
                id="auto-approve"
                name="auto_approve_threshold"
                type="number"
                min={0}
                max={100}
                inputMode="numeric"
                autoComplete="off"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                placeholder="95"
                className="h-9 rounded-[var(--radius-sm)] border-[var(--border-input)] bg-white px-3 text-sm"
              />
            </Field>
          </div>
        </div>
      </GlassCard>

      {/* Export Routing */}
      <GlassCard className="p-[25px]">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] tracking-tight mb-4">
          Export Routing
        </h2>
        <div className="space-y-4">
          <Field
            label="Routing Mode"
            htmlFor="routing-mode"
            description="Choose whether exports use one destination for all locations or per-location overrides"
          >
            <Select
              value={routingMode}
              onValueChange={(value: "org_wide" | "per_location") =>
                setRoutingMode(value)
              }
            >
              <SelectTrigger
                id="routing-mode"
                className="h-9 rounded-[var(--radius-sm)] border-[var(--border-input)] bg-white text-[var(--text-primary)]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="org_wide">Organization-wide default</SelectItem>
                <SelectItem value="per_location">Per-location with fallback</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field
            label="Organization Default Destination"
            htmlFor="org-default-destination"
            description="Fallback destination used for all exports and for locations without an override"
          >
            <Input
              id="org-default-destination"
              name="org_default_destination"
              autoComplete="off"
              inputMode="url"
              value={orgDefaultDestination}
              onChange={(e) => setOrgDefaultDestination(e.target.value)}
              placeholder="e.g., gsheets://finance/main"
              className="h-9 rounded-[var(--radius-sm)] border-[var(--border-input)] bg-white px-3 text-sm"
            />
          </Field>

          {routingMode === "per_location" && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-[var(--text-primary)]">
                Per-Location Overrides
              </p>
              {activeLocations.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">
                  No active locations found. Exports will use the organization default destination.
                </p>
              ) : (
                activeLocations.map((location) => (
                  <Field
                    key={location.id}
                    label={location.name}
                    htmlFor={`location-destination-${location.id}`}
                    description="Leave blank to use organization default destination"
                  >
                    <Input
                      id={`location-destination-${location.id}`}
                      name={`location_destination_${location.id}`}
                      autoComplete="off"
                      inputMode="url"
                      value={locationOverrides[location.id] ?? ""}
                      onChange={(e) => updateLocationOverride(location.id, e.target.value)}
                      placeholder="e.g., gsheets://locations/downtown"
                      className="h-9 rounded-[var(--radius-sm)] border-[var(--border-input)] bg-white px-3 text-sm"
                    />
                  </Field>
                ))
              )}
            </div>
          )}
        </div>
      </GlassCard>

      {/* Save button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isPending}
          className="h-10 px-4 rounded-[var(--radius-sm)] bg-[var(--primary)] text-white font-medium text-sm cursor-pointer hover:bg-[var(--primary)]/90"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          {isPending ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
