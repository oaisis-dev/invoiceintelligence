"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings2, Mail, Bell, Shield, Users, Database, CreditCard } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/ui/glass-card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { UserRole } from "@/types/database";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
  roles?: UserRole[];
};

const NAV_ITEMS: NavItem[] = [
  { label: "General", href: "/settings", icon: Settings2, roles: ["admin"] },
  { label: "Members", href: "/settings/members", icon: Users, roles: ["admin"] },
  {
    label: "Data Model",
    href: "/settings/data-model",
    icon: Database,
    roles: ["admin"],
  },
  {
    label: "Email Connections",
    href: "/settings/email-accounts",
    icon: Mail,
    roles: ["admin", "manager"],
  },
  {
    label: "Billing",
    href: "/settings/billing",
    icon: CreditCard,
    roles: ["admin"],
  },
  {
    label: "Notifications",
    href: "/settings/notifications",
    icon: Bell,
  },
  { label: "Security", href: "/settings/security", icon: Shield, disabled: true },
];

type SettingsNavProps = {
  role: UserRole;
};

export function SettingsNav({ role }: SettingsNavProps) {
  const pathname = usePathname();
  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(role)
  );

  return (
    <GlassCard className="p-[17px]">
      <nav className="flex flex-col gap-2" aria-label="Settings navigation">
        {visibleItems.map(({ label, href, icon: Icon, disabled }) => {
          const isActive =
            pathname === href || (href !== "/settings" && pathname.startsWith(href));

          if (disabled) {
            return (
              <Tooltip key={href}>
                <TooltipTrigger asChild>
                  <span
                    aria-disabled="true"
                    className="flex items-center gap-3 h-11 px-3 rounded-[var(--radius-md)] text-sm font-medium text-[var(--text-secondary)]/70 cursor-not-allowed"
                  >
                    <Icon className="size-5 shrink-0" />
                    {label}
                  </span>
                </TooltipTrigger>
                <TooltipContent>Coming soon.</TooltipContent>
              </Tooltip>
            );
          }

          return (
            <Link
              key={href}
              href={href}
              data-active={isActive ? "true" : "false"}
              className={cn(
                "flex items-center gap-3 h-11 px-3 rounded-[var(--radius-md)] text-sm font-medium transition-colors cursor-pointer",
                isActive
                  ? "bg-[var(--primary)] text-white shadow-[var(--shadow-button)]"
                  : "text-[var(--text-secondary)] hover:bg-black/5"
              )}
            >
              <Icon className="size-5 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
    </GlassCard>
  );
}
