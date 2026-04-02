"use client";

import { SectionReveal } from "@/components/ui/section-reveal";
import { NotificationPreferencesForm } from "@/components/notification-preferences-form";

export default function NotificationsSettingsPage() {
  return (
    <SectionReveal>
      <NotificationPreferencesForm />
    </SectionReveal>
  );
}
