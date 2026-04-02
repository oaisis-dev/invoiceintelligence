"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Upload,
  Mail,
  Bell,
  Settings,
  PanelLeftClose,
  Sparkles,
} from "lucide-react";
import { LogoIcon } from "@/components/logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { EnvironmentBadge } from "@/components/beta-badge";
import { useSubscription } from "@/components/subscription/subscription-provider";
import { useUnreadCountContext } from "@/components/unread-count-provider";
import { useUpgradeCheckout } from "@/hooks/use-upgrade-checkout";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
}

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/home", icon: LayoutDashboard },
  { title: "Invoices", href: "/invoices", icon: FileText },
  { title: "Upload", href: "/upload", icon: Upload },
  { title: "Email Inbox", href: "/email-inbox", icon: Mail },
  { title: "Settings", href: "/settings", icon: Settings },
];

function isActiveRoute(pathname: string, href: string): boolean {
  return pathname.startsWith(href);
}

function SidebarPlanCard() {
  const { plan, usage, loading } = useSubscription();
  const { startUpgrade, loading: upgradeLoading } = useUpgradeCheckout();

  if (loading || !plan) return null;

  const isFree = plan.tier === "free";
  const invoiceCount = usage?.monthlyInvoiceCount ?? 0;
  const invoiceLimit = usage?.monthlyInvoiceLimit ?? plan.monthly_invoice_limit;
  const usagePercent = invoiceLimit > 0 ? Math.min((invoiceCount / invoiceLimit) * 100, 100) : 0;

  if (!isFree) {
    // Paid plan — show compact plan badge
    return (
      <div className="rounded-[12px] border border-[var(--border-input)] bg-white/60 px-3 py-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-semibold uppercase tracking-wider text-[var(--primary)]">
            {plan.display_name}
          </span>
          <span className="text-[11px] text-[var(--text-secondary)]">
            {invoiceCount}/{invoiceLimit === -1 ? "\u221E" : invoiceLimit}
          </span>
        </div>
        <div className="mt-1.5 h-1 w-full rounded-full bg-[var(--primary)]/10">
          <div
            className="h-1 rounded-full bg-[var(--primary)] transition-all"
            style={{ width: `${invoiceLimit === -1 ? 0 : usagePercent}%` }}
          />
        </div>
      </div>
    );
  }

  // Free plan — show upgrade CTA
  return (
    <button
      onClick={startUpgrade}
      disabled={upgradeLoading}
      className="group block w-full text-left rounded-[12px] border border-[var(--primary)]/20 bg-gradient-to-br from-[var(--primary)]/5 to-[var(--primary)]/10 px-3 py-3 transition hover:border-[var(--primary)]/40 hover:shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-[var(--primary)]" />
        <span className="text-[13px] font-semibold text-[var(--text-primary)]">
          {upgradeLoading ? "Redirecting..." : "Upgrade to Business"}
        </span>
      </div>
      <p className="mt-1 text-[11px] leading-4 text-[var(--text-secondary)]">
        {invoiceCount}/{invoiceLimit} invoices used. Upgrade for unlimited.
      </p>
      <div className="mt-1.5 h-1 w-full rounded-full bg-[var(--primary)]/10">
        <div
          className={`h-1 rounded-full transition-all ${
            usagePercent >= 80 ? "bg-amber-500" : "bg-[var(--primary)]"
          }`}
          style={{ width: `${usagePercent}%` }}
        />
      </div>
    </button>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { toggleSidebar, open: sidebarOpen, isMobile } = useSidebar();
  const { count: unreadCount } = useUnreadCountContext();

  return (
    <Sidebar className="border-r border-border-glass">
      <SidebarHeader className="h-16 flex-row items-center gap-3 px-4">
        <Link href="/home" className="flex items-center gap-3">
          <LogoIcon className="h-8 w-auto" />
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-[16px] font-semibold leading-[24px] text-[var(--text-primary)]">
              Invoice Intelligence
            </span>
            <EnvironmentBadge />
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-4 py-4">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {navItems.map((item) => {
                const active = isActiveRoute(pathname, item.href);
                const Icon = item.icon;
                const isNotifications = item.title === "Notifications";
                const showBadge = isNotifications && unreadCount > 0;

                if (item.disabled) {
                  return (
                    <SidebarMenuItem key={item.href}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton
                            size="lg"
                            isActive={false}
                            aria-disabled="true"
                            tabIndex={-1}
                            className="pointer-events-auto h-11 cursor-default gap-3 rounded-[12px] px-4 opacity-50 hover:bg-transparent hover:text-[var(--text-secondary)]"
                          >
                            <Icon className="h-5 w-5 shrink-0 text-[var(--text-secondary)]" />
                            <span className="text-[14px] font-medium leading-[20px] tracking-[var(--tracking-normal)] text-[var(--text-secondary)]">
                              {item.title}
                            </span>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          Coming Soon
                        </TooltipContent>
                      </Tooltip>
                    </SidebarMenuItem>
                  );
                }

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      size="lg"
                      isActive={active}
                      className={
                        active
                          ? "h-11 gap-3 rounded-[12px] bg-[var(--primary)] px-4 text-white shadow-[var(--shadow-button)] hover:bg-[var(--primary)] hover:text-white"
                          : "h-11 gap-3 rounded-[12px] px-4 text-[var(--text-secondary)] hover:bg-[var(--primary-10)] hover:text-[var(--text-primary)]"
                      }
                    >
                      <Link href={item.href}>
                        <span className="relative shrink-0">
                          <Icon className="h-5 w-5" />
                          {showBadge && !sidebarOpen && !isMobile && (
                            <span
                              aria-hidden="true"
                              className={`absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full ring-2 ${
                                active
                                  ? "bg-white ring-[var(--primary)]"
                                  : "bg-[var(--primary)] ring-white"
                              }`}
                            />
                          )}
                        </span>
                        <span className="text-[14px] font-medium leading-[20px] tracking-[var(--tracking-normal)]">
                          {item.title}
                        </span>
                        {showBadge && (sidebarOpen || isMobile) && (
                          <span className={`ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-medium leading-none ${
                            active
                              ? "bg-white text-[var(--primary)]"
                              : "bg-[var(--primary)] text-white"
                          }`}>
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-4 pb-4 space-y-3">
        <SidebarPlanCard />
        {/* User profile + notification badge */}
        <button
          type="button"
          onClick={toggleSidebar}
          className="flex h-9 w-full cursor-pointer items-center gap-2 rounded-[12px] bg-white/50 px-4 text-[14px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-white/70"
        >
          <PanelLeftClose className="h-4 w-4 shrink-0" />
          <span>{isMobile ? "Close" : "Collapse"}</span>
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
