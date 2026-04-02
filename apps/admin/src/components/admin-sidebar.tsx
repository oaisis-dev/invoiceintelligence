"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  Cog,
  PanelLeftClose,
  Shield,
  UserCog,
  CreditCard,
  MessageSquare,
  Database,
} from "lucide-react";
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
import type { LucideIcon } from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Organizations", href: "/organizations", icon: Building2 },
  { title: "Users", href: "/users", icon: Users },
  { title: "Admins", href: "/admins", icon: UserCog },
  { title: "Subscription Plans", href: "/subscription-plans", icon: CreditCard },
  { title: "Contact Requests", href: "/contact-requests", icon: MessageSquare },
  { title: "System Config", href: "/system-config", icon: Database },
  { title: "System", href: "/system", icon: Cog },
];

function isActiveRoute(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function AdminSidebar() {
  const pathname = usePathname();
  const { toggleSidebar } = useSidebar();

  return (
    <Sidebar className="border-r border-border-glass">
      <SidebarHeader className="h-16 flex-row items-center gap-3 px-4">
        <Link href="/" className="flex items-center gap-3">
          <Shield className="h-7 w-7 text-[var(--primary)]" />
          <span className="text-[16px] font-semibold leading-[24px] text-[var(--text-primary)]">
            Platform Admin
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-4 py-4">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {navItems.map((item) => {
                const active = isActiveRoute(pathname, item.href);
                const Icon = item.icon;

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
                        <Icon className="h-5 w-5 shrink-0" />
                        <span className="text-[14px] font-medium leading-[20px] tracking-[var(--tracking-normal)]">
                          {item.title}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-4 pb-4">
        <button
          type="button"
          onClick={toggleSidebar}
          className="flex h-9 w-full cursor-pointer items-center gap-2 rounded-[12px] bg-[var(--bg-sidebar)] px-4 text-[14px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--primary-05)]"
        >
          <PanelLeftClose className="h-4 w-4 shrink-0" />
          <span>Collapse</span>
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
