import * as React from "react";
import {
  Inbox,
  LoaderCircle,
  CircleCheck,
  CircleX,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type EmailIngestionStatus =
  | "received"
  | "processing"
  | "completed"
  | "failed";

export interface EmailStatusBadgeProps {
  status: EmailIngestionStatus;
  className?: string;
}

const statusConfig: Record<
  EmailIngestionStatus,
  { label: string; icon: React.ElementType; className: string }
> = {
  received: {
    label: "Received",
    icon: Inbox,
    className: "bg-blue-50 text-blue-700",
  },
  processing: {
    label: "Processing",
    icon: LoaderCircle,
    className: "bg-warning-10 text-amber-700",
  },
  completed: {
    label: "Completed",
    icon: CircleCheck,
    className: "bg-success-10 text-success",
  },
  failed: {
    label: "Failed",
    icon: CircleX,
    className: "bg-error-10 text-error",
  },
};

export function EmailStatusBadge({
  status,
  className,
}: EmailStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-normal leading-4 whitespace-nowrap",
        config.className,
        className
      )}
    >
      <Icon
        className={cn(
          "size-3",
          status === "processing" && "animate-spin"
        )}
        aria-hidden="true"
      />
      {config.label}
    </span>
  );
}
