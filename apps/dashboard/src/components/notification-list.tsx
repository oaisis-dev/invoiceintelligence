"use client";

import { NotificationItem } from "@/components/notification-item";
import type { UserNotification } from "@/types/notifications";
import { Bell } from "lucide-react";

interface NotificationListProps {
  notifications: UserNotification[];
  isLoading: boolean;
  onMarkRead?: (id: string) => void;
  onDismiss?: (id: string) => void;
}

export function NotificationList({
  notifications,
  isLoading,
  onMarkRead,
  onDismiss,
}: NotificationListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-1 py-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3 px-4 py-3 animate-pulse">
            <div className="h-8 w-8 rounded-full bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded bg-gray-200" />
              <div className="h-3 w-1/2 rounded bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
          <Bell className="h-5 w-5 text-[var(--text-secondary)]" />
        </div>
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            No notifications
          </p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            You&apos;re all caught up!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[var(--border-glass)]">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onMarkRead={onMarkRead}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
}
