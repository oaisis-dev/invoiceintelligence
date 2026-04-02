"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSupabase } from "@/hooks/use-supabase";
import { getNotifications } from "@/lib/api-client";
import { getNotificationHref } from "@/lib/notification-routes";
import type { UserNotification, NotificationCategory } from "@/types/notifications";
import { toast } from "sonner";

/**
 * Fetches notifications and subscribes to Realtime for live updates.
 * On critical severity INSERT, shows a sonner toast.
 */
export function useNotifications(options?: {
  category?: NotificationCategory;
  unreadOnly?: boolean;
  limit?: number;
}) {
  const supabase = useSupabase();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isMountedRef = useRef(true);

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await getNotifications({
        category: options?.category,
        unread_only: options?.unreadOnly,
        limit: options?.limit,
      });
      if (isMountedRef.current) {
        setNotifications(result.data);
      }
    } catch {
      // Keep existing data on error
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [options?.category, options?.unreadOnly, options?.limit]);

  // Initial fetch
  useEffect(() => {
    isMountedRef.current = true;
    fetchNotifications();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchNotifications]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("notifications-list")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_notifications",
        },
        (payload: { new: Record<string, unknown> }) => {
          const notification = payload.new as unknown as UserNotification;

          // Add to list
          setNotifications((prev) => [notification, ...prev]);

          // Critical severity toast
          if (notification.severity === "critical" && notification.is_unread) {
            const href = getNotificationHref(notification);
            toast.error(notification.title, {
              description: notification.body ?? undefined,
              action: href
                ? { label: "View", onClick: () => { window.location.href = href; } }
                : undefined,
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "user_notifications",
        },
        (payload: { new: Record<string, unknown> }) => {
          const updated = payload.new as unknown as UserNotification;
          setNotifications((prev) =>
            prev.map((n) => (n.id === updated.id ? updated : n))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  return { notifications, isLoading, refetch: fetchNotifications };
}
