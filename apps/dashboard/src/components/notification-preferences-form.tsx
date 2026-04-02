"use client";

import { useCallback, useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GlassCard } from "@/components/ui/glass-card";
import {
  getNotificationPreferences,
  updateNotificationPreference,
} from "@/lib/api-client";
import type {
  NotificationCategory,
  NotificationPreference,
  NotificationSeverity,
} from "@/types/notifications";
import { toast } from "sonner";

const CATEGORIES: {
  value: NotificationCategory;
  label: string;
  description: string;
}[] = [
  {
    value: "invoice",
    label: "Invoices",
    description: "Processing results, approvals, and exports",
  },
  {
    value: "member",
    label: "Members",
    description: "Invitations, role changes, and deactivations",
  },
  {
    value: "email",
    label: "Email Intake",
    description: "Inbox health alerts and connection issues",
  },
  {
    value: "system",
    label: "System",
    description: "Configuration changes and system updates",
  },
];

const SEVERITY_OPTIONS: { value: NotificationSeverity; label: string }[] = [
  { value: "info", label: "All (info+)" },
  { value: "warning", label: "Warning+" },
  { value: "critical", label: "Critical only" },
];

type PreferenceMap = Record<NotificationCategory, NotificationPreference>;

function defaultPreference(category: NotificationCategory): NotificationPreference {
  return {
    id: "",
    user_id: "",
    org_id: "",
    category,
    in_app_enabled: true,
    email_enabled: true,
    minimum_severity: "info",
    created_at: "",
    updated_at: "",
  };
}

export function NotificationPreferencesForm() {
  const [preferences, setPreferences] = useState<PreferenceMap | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPausing, setIsPausing] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const result = await getNotificationPreferences();
        const map: PreferenceMap = {} as PreferenceMap;
        for (const cat of CATEGORIES) {
          const existing = result.data.find((p) => p.category === cat.value);
          map[cat.value] = existing ?? defaultPreference(cat.value);
        }
        setPreferences(map);
      } catch {
        toast.error("Failed to load notification preferences");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const isPausedAll = preferences
    ? Object.values(preferences).every((p) => !p.in_app_enabled && !p.email_enabled)
    : false;

  const handleToggle = useCallback(
    async (
      category: NotificationCategory,
      field: "in_app_enabled" | "email_enabled",
      value: boolean
    ) => {
      if (!preferences) return;
      const pref = preferences[category];
      const updated = { ...pref, [field]: value };

      setPreferences((prev) => (prev ? { ...prev, [category]: updated } : prev));

      try {
        await updateNotificationPreference({
          category: updated.category,
          in_app_enabled: updated.in_app_enabled,
          email_enabled: updated.email_enabled,
          minimum_severity: updated.minimum_severity,
        });
      } catch {
        setPreferences((prev) => (prev ? { ...prev, [category]: pref } : prev));
        toast.error("Failed to update preference");
      }
    },
    [preferences]
  );

  const handleSeverity = useCallback(
    async (category: NotificationCategory, severity: NotificationSeverity) => {
      if (!preferences) return;
      const pref = preferences[category];
      const updated = { ...pref, minimum_severity: severity };

      setPreferences((prev) => (prev ? { ...prev, [category]: updated } : prev));

      try {
        await updateNotificationPreference({
          category: updated.category,
          in_app_enabled: updated.in_app_enabled,
          email_enabled: updated.email_enabled,
          minimum_severity: updated.minimum_severity,
        });
      } catch {
        setPreferences((prev) => (prev ? { ...prev, [category]: pref } : prev));
        toast.error("Failed to update preference");
      }
    },
    [preferences]
  );

  const handlePauseAll = useCallback(
    async (pause: boolean) => {
      if (!preferences) return;
      setIsPausing(true);

      const snapshot = { ...preferences };
      const targetInApp = !pause;
      const targetEmail = !pause;

      // Optimistically update all categories
      const optimistic: PreferenceMap = {} as PreferenceMap;
      for (const cat of CATEGORIES) {
        optimistic[cat.value] = {
          ...preferences[cat.value],
          in_app_enabled: targetInApp,
          email_enabled: targetEmail,
        };
      }
      setPreferences(optimistic);

      // Fire all updates in parallel
      const results = await Promise.allSettled(
        CATEGORIES.map((cat) =>
          updateNotificationPreference({
            category: cat.value,
            in_app_enabled: targetInApp,
            email_enabled: targetEmail,
            minimum_severity: preferences[cat.value].minimum_severity,
          })
        )
      );

      // Revert only failed categories
      let hasFailure = false;
      setPreferences((prev) => {
        if (!prev) return prev;
        const patched = { ...prev };
        results.forEach((result, i) => {
          if (result.status === "rejected") {
            hasFailure = true;
            patched[CATEGORIES[i].value] = snapshot[CATEGORIES[i].value];
          }
        });
        return patched;
      });

      if (hasFailure) {
        toast.error("Some preferences failed to update");
      }
      setIsPausing(false);
    },
    [preferences]
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <GlassCard className="h-16 animate-pulse" />
        <GlassCard className="h-64 animate-pulse" />
      </div>
    );
  }

  if (!preferences) return null;

  return (
    <div className="space-y-4">
      {/* Pause all toggle */}
      <GlassCard className="p-5">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Pause all notifications
            </p>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              Temporarily mute all in-app and email notifications
            </p>
          </div>
          <Switch
            id="pause-all"
            checked={isPausedAll}
            disabled={isPausing}
            onCheckedChange={(checked) => handlePauseAll(checked)}
          />
        </div>
      </GlassCard>

      {/* Preferences table */}
      <GlassCard className="p-0 overflow-hidden">
        {/* Desktop header */}
        <div className="hidden md:grid grid-cols-[1fr_80px_80px_140px] items-center gap-x-2 border-b border-[var(--border-glass)] px-5 py-3">
          <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-secondary)]">
            Category
          </span>
          <span className="text-center text-[11px] font-medium uppercase tracking-wider text-[var(--text-secondary)]">
            In-app
          </span>
          <span className="text-center text-[11px] font-medium uppercase tracking-wider text-[var(--text-secondary)]">
            Email
          </span>
          <span className="text-right text-[11px] font-medium uppercase tracking-wider text-[var(--text-secondary)]">
            Min. severity
          </span>
        </div>

        {CATEGORIES.map((cat, idx) => {
          const pref = preferences[cat.value];
          const isLast = idx === CATEGORIES.length - 1;
          const disabled = isPausedAll;

          return (
            <div
              key={cat.value}
              className={`px-5 py-4 ${!isLast ? "border-b border-[var(--border-glass)]" : ""} ${disabled ? "opacity-50" : ""}`}
            >
              {/* Desktop: grid row */}
              <div className="hidden md:grid grid-cols-[1fr_80px_80px_140px] items-center gap-x-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {cat.label}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                    {cat.description}
                  </p>
                </div>
                <div className="flex justify-center">
                  <Switch
                    id={`${cat.value}-in-app`}
                    checked={pref.in_app_enabled}
                    disabled={disabled}
                    onCheckedChange={(v) =>
                      handleToggle(cat.value, "in_app_enabled", v)
                    }
                  />
                </div>
                <div className="flex justify-center">
                  <Switch
                    id={`${cat.value}-email`}
                    checked={pref.email_enabled}
                    disabled={disabled}
                    onCheckedChange={(v) =>
                      handleToggle(cat.value, "email_enabled", v)
                    }
                  />
                </div>
                <div className="flex justify-end">
                  <Select
                    value={pref.minimum_severity}
                    disabled={disabled}
                    onValueChange={(v) =>
                      handleSeverity(cat.value, v as NotificationSeverity)
                    }
                  >
                    <SelectTrigger className="h-8 w-[130px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SEVERITY_OPTIONS.map((opt) => (
                        <SelectItem
                          key={opt.value}
                          value={opt.value}
                          className="text-xs"
                        >
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Mobile: stacked layout */}
              <div className="md:hidden space-y-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {cat.label}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                    {cat.description}
                  </p>
                </div>
                <div className="flex items-center gap-5">
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`${cat.value}-in-app-mobile`}
                      checked={pref.in_app_enabled}
                      disabled={disabled}
                      onCheckedChange={(v) =>
                        handleToggle(cat.value, "in_app_enabled", v)
                      }
                    />
                    <Label
                      htmlFor={`${cat.value}-in-app-mobile`}
                      className="text-xs text-[var(--text-secondary)]"
                    >
                      In-app
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`${cat.value}-email-mobile`}
                      checked={pref.email_enabled}
                      disabled={disabled}
                      onCheckedChange={(v) =>
                        handleToggle(cat.value, "email_enabled", v)
                      }
                    />
                    <Label
                      htmlFor={`${cat.value}-email-mobile`}
                      className="text-xs text-[var(--text-secondary)]"
                    >
                      Email
                    </Label>
                  </div>
                  <Select
                    value={pref.minimum_severity}
                    disabled={disabled}
                    onValueChange={(v) =>
                      handleSeverity(cat.value, v as NotificationSeverity)
                    }
                  >
                    <SelectTrigger className="ml-auto h-7 w-[120px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SEVERITY_OPTIONS.map((opt) => (
                        <SelectItem
                          key={opt.value}
                          value={opt.value}
                          className="text-xs"
                        >
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          );
        })}
      </GlassCard>
    </div>
  );
}
