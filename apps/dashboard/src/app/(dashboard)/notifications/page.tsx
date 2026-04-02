"use client";

import { useCallback, useState } from "react";
import { SectionReveal } from "@/components/ui/section-reveal";
import { GlassCard } from "@/components/ui/glass-card";
import { NotificationFilters, type NotificationFilter } from "@/components/notification-filters";
import { NotificationList } from "@/components/notification-list";
import { useNotifications } from "@/hooks/use-notifications";
import { useUnreadCount } from "@/hooks/use-unread-count";
import {
  markNotificationsRead,
  markAllNotificationsRead,
  dismissNotifications,
} from "@/lib/api-client";
import type { NotificationCategory } from "@/types/notifications";

export default function NotificationsPage() {
  const [filter, setFilter] = useState<NotificationFilter>("all");

  const category: NotificationCategory | undefined =
    filter !== "all" && filter !== "unread" && filter !== "critical"
      ? (filter as NotificationCategory)
      : undefined;
  const unreadOnly = filter === "unread";

  const { notifications: rawNotifications, isLoading, refetch } = useNotifications({
    category,
    unreadOnly,
  });
  const { refresh: refreshCount } = useUnreadCount();

  // Client-side severity filter for "critical"
  const notifications = filter === "critical"
    ? rawNotifications.filter((n) => n.severity === "critical")
    : rawNotifications;

  const handleMarkRead = useCallback(
    async (id: string) => {
      try {
        await markNotificationsRead([id]);
        refetch();
        refreshCount();
      } catch {
        // Silently ignore
      }
    },
    [refetch, refreshCount]
  );

  const handleDismiss = useCallback(
    async (id: string) => {
      try {
        await dismissNotifications([id]);
        refetch();
        refreshCount();
      } catch {
        // Silently ignore
      }
    },
    [refetch, refreshCount]
  );

  const handleMarkAllRead = useCallback(async () => {
    try {
      await markAllNotificationsRead();
      refetch();
      refreshCount();
    } catch {
      // Silently ignore
    }
  }, [refetch, refreshCount]);

  return (
    <SectionReveal>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <NotificationFilters value={filter} onChange={setFilter} />
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="text-xs text-[var(--primary)] hover:underline"
          >
            Mark all read
          </button>
        </div>

        <GlassCard className="p-0 overflow-hidden">
          <NotificationList
            notifications={notifications}
            isLoading={isLoading}
            onMarkRead={handleMarkRead}
            onDismiss={handleDismiss}
          />
        </GlassCard>
      </div>
    </SectionReveal>
  );
}
