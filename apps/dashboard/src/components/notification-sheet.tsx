"use client";

import { useCallback } from "react";
import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { NotificationList } from "@/components/notification-list";
import { useNotifications } from "@/hooks/use-notifications";
import { useUnreadCountContext } from "@/components/unread-count-provider";
import {
  markNotificationsRead,
  markAllNotificationsRead,
  dismissNotifications,
} from "@/lib/api-client";

interface NotificationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationSheet({ open, onOpenChange }: NotificationSheetProps) {
  const { notifications, isLoading, refetch } = useNotifications({ limit: 20 });
  const { refresh: refreshCount } = useUnreadCountContext();

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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] sm:w-[440px] p-0 flex flex-col">
        <SheetHeader className="px-4 pt-4 pb-3 border-b border-[var(--border-glass)]">
          <div className="flex items-center justify-between pr-8">
            <SheetTitle className="text-base">Notifications</SheetTitle>
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-xs text-[var(--primary)] hover:underline"
            >
              Mark all read
            </button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          <NotificationList
            notifications={notifications}
            isLoading={isLoading}
            onMarkRead={handleMarkRead}
            onDismiss={handleDismiss}
          />
        </div>

        <div className="flex items-center justify-between border-t border-[var(--border-glass)] px-4 py-3">
          <Link
            href="/notifications"
            onClick={() => onOpenChange(false)}
            className="text-xs text-[var(--primary)] hover:underline"
          >
            View all
          </Link>
          <Link
            href="/settings/notifications"
            onClick={() => onOpenChange(false)}
            className="text-xs text-[var(--text-secondary)] hover:underline"
          >
            Preferences
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
