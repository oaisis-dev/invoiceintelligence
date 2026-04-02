import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/"),
}));

// Mock Clerk's UserButton since it requires ClerkProvider context
vi.mock("@clerk/nextjs", () => ({
  UserButton: () => <div data-testid="clerk-user-button">UserButton</div>,
}));

// Mock NotificationBell since it depends on Supabase/Clerk context
vi.mock("@/components/notification-bell", () => ({
  NotificationBell: () => <div data-testid="notification-bell">NotificationBell</div>,
}));

// Mock useSidebar since it requires SidebarProvider context
vi.mock("@/components/ui/sidebar", () => ({
  useSidebar: () => ({ open: true, isMobile: false, toggleSidebar: vi.fn() }),
}));

import { AppHeader } from "./app-header";

describe("AppHeader", () => {
  it("renders the page title", () => {
    render(<AppHeader title="Dashboard" subtitle="Welcome back! Here's your overview" />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("renders the subtitle", () => {
    render(<AppHeader title="Dashboard" subtitle="Welcome back! Here's your overview" />);
    expect(screen.getByText("Welcome back! Here's your overview")).toBeInTheDocument();
  });

  it("renders the Clerk UserButton", () => {
    render(<AppHeader title="Dashboard" subtitle="Overview" />);
    expect(screen.getByTestId("clerk-user-button")).toBeInTheDocument();
  });

  it("renders the NotificationBell", () => {
    render(<AppHeader title="Dashboard" subtitle="Overview" />);
    expect(screen.getByTestId("notification-bell")).toBeInTheDocument();
  });
});
