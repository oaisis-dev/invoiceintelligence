"use client";

import { UserButton } from "@clerk/nextjs";
import { PanelLeftOpen } from "lucide-react";
import { NotificationBell } from "@/components/notification-bell";
import { useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

interface AppHeaderProps {
  title: string;
  subtitle: string;
}

export function AppHeader({ title, subtitle }: AppHeaderProps) {
  const { open, isMobile, toggleSidebar } = useSidebar();

  return (
    <header className="flex h-16 items-center justify-between border-b border-[var(--border-glass)] bg-[var(--bg-header)] px-4 sm:px-8">
      <div className="flex items-center gap-3">
        {(isMobile || !open) && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="size-8"
            aria-label="Open sidebar"
          >
            <PanelLeftOpen className="size-4" />
          </Button>
        )}
        <div className="flex flex-col">
          <p className="text-[20px] font-semibold leading-[28px] tracking-[var(--tracking-tight)] text-[var(--text-primary)] text-balance">
            {title}
          </p>
          <p className="text-[14px] font-normal leading-[20px] tracking-[var(--tracking-normal)] text-[var(--text-secondary)] text-pretty">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <NotificationBell />
        <UserButton
          appearance={{
            elements: {
              avatarBox: "h-8 w-8",
            },
          }}
        />
      </div>
    </header>
  );
}
