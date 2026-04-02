"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { getNotificationHref } from "@/lib/notification-routes";
import type { UserNotification } from "@/types/notifications";
import {
  FileText,
  Users,
  Mail,
  Settings,
  AlertTriangle,
  AlertCircle,
  Info,
  X,
} from "lucide-react";

const CATEGORY_ICONS: Record<string, typeof FileText> = {
  invoice: FileText,
  member: Users,
  email: Mail,
  system: Settings,
  platform: Settings,
};

const SEVERITY_ICONS: Record<string, typeof Info> = {
  info: Info,
  warning: AlertTriangle,
  critical: AlertCircle,
};

const SEVERITY_COLORS: Record<string, string> = {
  info: "text-blue-500",
  warning: "text-amber-500",
  critical: "text-red-500",
};

const SEVERITY_LABELS: Record<string, string> = {
  info: "Info",
  warning: "Warning",
  critical: "Critical",
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

interface NotificationItemProps {
  notification: UserNotification;
  onMarkRead?: (id: string) => void;
  onDismiss?: (id: string) => void;
}

export function NotificationItem({
  notification,
  onMarkRead,
  onDismiss,
}: NotificationItemProps) {
  const router = useRouter();
  const CategoryIcon = CATEGORY_ICONS[notification.category] ?? FileText;
  const SeverityIcon = SEVERITY_ICONS[notification.severity] ?? Info;
  const severityColor = SEVERITY_COLORS[notification.severity] ?? "text-blue-500";
  const severityLabel = SEVERITY_LABELS[notification.severity] ?? "Info";
  const href = getNotificationHref(notification);

  const handleClick = () => {
    if (notification.is_unread && onMarkRead) {
      onMarkRead(notification.id);
    }
    if (href) {
      router.push(href);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      className={cn(
        "flex gap-3 px-4 py-3 transition-colors",
        href ? "cursor-pointer" : "cursor-default",
        notification.is_unread
          ? "border-l-2 border-l-[var(--primary)] bg-blue-50/50 hover:bg-blue-50/80"
          : "border-l-2 border-l-transparent hover:bg-black/[0.02]"
      )}
    >
      {/* Category icon */}
      <div className="flex-shrink-0 pt-0.5">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full",
            notification.is_unread ? "bg-blue-100" : "bg-gray-100"
          )}
        >
          <CategoryIcon className="h-4 w-4 text-[var(--text-secondary)]" />
        </div>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm leading-snug",
            notification.is_unread
              ? "font-semibold text-[var(--text-primary)]"
              : "font-medium text-[var(--text-secondary)]"
          )}
        >
          {notification.title}
        </p>
        {notification.body && (
          <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-secondary)] line-clamp-2">
            {notification.body}
          </p>
        )}
        <div className="mt-1 flex items-center gap-2">
          <span className="text-[11px] text-[var(--text-secondary)]/70">
            {timeAgo(notification.created_at)}
          </span>
          <span
            className={cn("inline-flex items-center gap-0.5 text-[11px]", severityColor)}
            title={severityLabel}
          >
            <SeverityIcon className="h-3 w-3" />
            {notification.severity !== "info" && (
              <span className="font-medium">{severityLabel}</span>
            )}
          </span>
        </div>
      </div>

      {/* Dismiss button */}
      {onDismiss && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss(notification.id);
          }}
          className="flex-shrink-0 self-center flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-secondary)]/50 hover:text-[var(--text-secondary)] hover:bg-black/[0.06] transition-colors"
          title="Dismiss"
          aria-label="Dismiss notification"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
