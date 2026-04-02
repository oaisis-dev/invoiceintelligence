"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { motionTransitions } from "@/components/ui/motion-primitives";
import { NotificationSheet } from "@/components/notification-sheet";
import { useUnreadCountContext } from "@/components/unread-count-provider";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { count } = useUnreadCountContext();

  return (
    <>
      <motion.div
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.98 }}
        transition={motionTransitions.feedback}
      >
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="relative size-9 rounded-[var(--radius-sm)] hover:bg-white/50"
          aria-label={`Notifications${count > 0 ? ` (${count} unread)` : ""}`}
          onClick={() => setOpen(true)}
        >
          <Bell className="h-4 w-4 text-[var(--text-secondary)]" />
          {count > 0 && (
            <span
              data-testid="notification-dot"
              aria-hidden="true"
              className="absolute left-6 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--primary)] px-1"
            >
              <span className="text-[10px] font-medium leading-none text-white">
                {count > 99 ? "99+" : count}
              </span>
            </span>
          )}
        </Button>
      </motion.div>
      <NotificationSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
