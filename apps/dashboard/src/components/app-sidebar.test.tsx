import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/navigation before importing the component
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/"),
}));

// Mock use-mobile hook to avoid matchMedia issues in jsdom
vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: vi.fn(() => false),
}));

// Mock subscription provider
vi.mock("@/components/subscription/subscription-provider", () => ({
  useSubscription: vi.fn(() => ({
    plan: null,
    usage: null,
    loading: true,
  })),
}));

// Mock unread count provider
vi.mock("@/components/unread-count-provider", () => ({
  useUnreadCountContext: vi.fn(() => ({
    count: 0,
    refresh: vi.fn(),
  })),
}));

import { AppSidebar } from "./app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";
import { useSubscription } from "@/components/subscription/subscription-provider";
import { useUnreadCountContext } from "@/components/unread-count-provider";

function renderSidebar(pathname = "/") {
  vi.mocked(usePathname).mockReturnValue(pathname);
  return render(
    <SidebarProvider defaultOpen>
      <AppSidebar />
    </SidebarProvider>
  );
}

describe("AppSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the brand header with title", () => {
    renderSidebar();
    expect(screen.getByText("Invoice Intelligence")).toBeInTheDocument();
  });

  it("renders all navigation items", () => {
    renderSidebar();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Invoices")).toBeInTheDocument();
    expect(screen.getByText("Upload")).toBeInTheDocument();
    expect(screen.getByText("Email Inbox")).toBeInTheDocument();
    // Notifications moved to header
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("renders a collapse button", () => {
    renderSidebar();
    expect(screen.getByText("Collapse")).toBeInTheDocument();
  });

  it("marks Dashboard as active when on /home path", () => {
    renderSidebar("/home");
    const dashboardButton = screen.getByText("Dashboard").closest(
      "[data-sidebar='menu-button']"
    );
    expect(dashboardButton).toHaveAttribute("data-active", "true");
  });

  it("marks Invoices as active when on /invoices path", () => {
    renderSidebar("/invoices");
    const invoicesButton = screen.getByText("Invoices").closest(
      "[data-sidebar='menu-button']"
    );
    expect(invoicesButton).toHaveAttribute("data-active", "true");
  });

  it("does not mark enabled items with aria-disabled", () => {
    renderSidebar();
    // Email Inbox is NOT disabled
    const emailInboxButton = screen.getByText("Email Inbox").closest(
      "[data-sidebar='menu-button']"
    );
    expect(emailInboxButton).not.toHaveAttribute("aria-disabled", "true");
  });

  it("renders navigation links for enabled items", () => {
    renderSidebar();
    const dashboardLink = screen.getByText("Dashboard").closest("a");
    expect(dashboardLink).toHaveAttribute("href", "/home");

    const invoicesLink = screen.getByText("Invoices").closest("a");
    expect(invoicesLink).toHaveAttribute("href", "/invoices");

    // Notifications moved to header — no longer in sidebar
  });

  it("has correct sidebar landmark role", () => {
    renderSidebar();
    // The sidebar inner element should exist
    const sidebar = document.querySelector("[data-sidebar='sidebar']");
    expect(sidebar).toBeInTheDocument();
  });

  // Notifications moved to header — badge tests no longer apply to sidebar
  it("does not render notification badge in sidebar", () => {
    vi.mocked(useUnreadCountContext).mockReturnValue({
      count: 5,
      refresh: vi.fn(),
    });
    renderSidebar();
    expect(screen.queryByText("5")).not.toBeInTheDocument();
    expect(screen.queryByText("99+")).not.toBeInTheDocument();
  });

  it("does not render plan card while loading", () => {
    vi.mocked(useSubscription).mockReturnValue({
      plan: null,
      usage: null,
      loading: true,
      refreshSubscription: vi.fn(),
    } as ReturnType<typeof useSubscription>);
    renderSidebar();
    expect(screen.queryByText("Upgrade to Pro")).not.toBeInTheDocument();
  });

  it("renders upgrade CTA for free plan", () => {
    vi.mocked(useSubscription).mockReturnValue({
      plan: {
        id: "plan-1",
        tier: "free",
        display_name: "Free",
        monthly_invoice_limit: 10,
        max_users: 1,
        price_cents: 0,
        workspace_type: "individual",
        payment_price_id: null,
        features: [],
        is_active: true,
        sort_order: 1,
        created_at: "",
        updated_at: "",
      },
      usage: {
        monthlyInvoiceCount: 3,
        monthlyInvoiceLimit: 10,
        activeUserCount: 1,
        maxUsers: 1,
        workspaceType: "individual",
        planId: "plan-1",
        subscriptionStatus: "active",
        gracePeriodEnd: null,
      },
      loading: false,
      refreshSubscription: vi.fn(),
    } as ReturnType<typeof useSubscription>);
    renderSidebar();
    expect(screen.getByText("Upgrade to Business")).toBeInTheDocument();
    expect(screen.getByText("3/10 invoices used. Upgrade for unlimited.")).toBeInTheDocument();
  });

  it("renders compact plan badge for paid plan", () => {
    vi.mocked(useSubscription).mockReturnValue({
      plan: {
        id: "plan-2",
        tier: "pro",
        display_name: "Pro",
        monthly_invoice_limit: 100,
        max_users: 1,
        price_cents: 3000,
        workspace_type: "individual",
        payment_price_id: "price_123",
        features: [],
        is_active: true,
        sort_order: 2,
        created_at: "",
        updated_at: "",
      },
      usage: {
        monthlyInvoiceCount: 25,
        monthlyInvoiceLimit: 100,
        activeUserCount: 1,
        maxUsers: 1,
        workspaceType: "individual",
        planId: "plan-2",
        subscriptionStatus: "active",
        gracePeriodEnd: null,
      },
      loading: false,
      refreshSubscription: vi.fn(),
    } as ReturnType<typeof useSubscription>);
    renderSidebar();
    expect(screen.getByText("Pro")).toBeInTheDocument();
    expect(screen.getByText("25/100")).toBeInTheDocument();
    expect(screen.queryByText("Upgrade to Pro")).not.toBeInTheDocument();
  });
});
