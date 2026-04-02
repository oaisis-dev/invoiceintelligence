"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function NotificationEmailSetting() {
  const [email, setEmail] = useState("");
  const [savedEmail, setSavedEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/contact-requests/settings")
      .then((res) => res.json())
      .then((data) => {
        const val = data.value ?? "";
        // JSONB strings may come with surrounding quotes
        const cleaned = typeof val === "string" ? val.replace(/^"|"$/g, "") : String(val);
        setEmail(cleaned);
        setSavedEmail(cleaned);
      })
      .catch(() => toast.error("Failed to load notification email"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error("Email cannot be empty");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/contact-requests/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message ?? "Failed to save");
      }
      setSavedEmail(trimmed);
      toast.success("Notification email updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const isDirty = email.trim() !== savedEmail;

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border-glass)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-card)] backdrop-blur-md">
      <Label className="text-sm font-medium text-[var(--text-primary)]">
        Notification Email
      </Label>
      <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
        Contact form submissions will be emailed to this address.
      </p>
      <div className="mt-3 flex items-center gap-3">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="agent@openoaisis.com"
          disabled={loading}
          className="max-w-sm"
        />
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving || loading || !isDirty}
        >
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}
