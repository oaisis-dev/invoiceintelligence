import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SettingsNav } from "./settings-nav";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/settings"),
}));

// Dynamic import for mocking
import { usePathname } from "next/navigation";
const mockUsePathname = vi.mocked(usePathname);

describe("SettingsNav", () => {
  it("renders all seven navigation items for owners", () => {
    render(<SettingsNav role="admin" />);

    expect(screen.getByText("General")).toBeInTheDocument();
    expect(screen.getByText("Members")).toBeInTheDocument();
    expect(screen.getByText("Data Model")).toBeInTheDocument();
    expect(screen.getByText("Email Connections")).toBeInTheDocument();
    expect(screen.getByText("Billing")).toBeInTheDocument();
    expect(screen.getByText("Notifications")).toBeInTheDocument();
    expect(screen.getByText("Security")).toBeInTheDocument();
  });

  it("renders Lucide icons for each visible nav item", () => {
    const { container } = render(<SettingsNav role="admin" />);

    const icons = container.querySelectorAll("svg");
    expect(icons).toHaveLength(7);
  });

  it("highlights the active nav item based on pathname", () => {
    mockUsePathname.mockReturnValue("/settings");
    render(<SettingsNav role="admin" />);

    const generalLink = screen.getByRole("link", { name: /general/i });
    expect(generalLink).toHaveAttribute("data-active", "true");

    const dataModelLink = screen.getByRole("link", { name: /data model/i });
    expect(dataModelLink).toHaveAttribute("data-active", "false");
  });

  it("highlights data model when on data model path", () => {
    mockUsePathname.mockReturnValue("/settings/data-model");
    render(<SettingsNav role="admin" />);

    const dataModelLink = screen.getByRole("link", { name: /data model/i });
    expect(dataModelLink).toHaveAttribute("data-active", "true");

    const generalLink = screen.getByRole("link", { name: /general/i });
    expect(generalLink).toHaveAttribute("data-active", "false");
  });

  it("has correct href attributes for enabled nav items", () => {
    render(<SettingsNav role="admin" />);

    expect(screen.getByRole("link", { name: /general/i })).toHaveAttribute(
      "href",
      "/settings"
    );
    expect(screen.getByRole("link", { name: /members/i })).toHaveAttribute(
      "href",
      "/settings/members"
    );
    expect(
      screen.getByRole("link", { name: /data model/i })
    ).toHaveAttribute("href", "/settings/data-model");
    expect(
      screen.getByRole("link", { name: /email connections/i })
    ).toHaveAttribute("href", "/settings/email-accounts");
    expect(
      screen.getByRole("link", { name: /notifications/i })
    ).toHaveAttribute("href", "/settings/notifications");
    expect(screen.queryByRole("link", { name: /security/i })).toBeNull();

    const { container } = render(<SettingsNav role="admin" />);
    const disabledItems = container.querySelectorAll("[aria-disabled='true']");
    expect(disabledItems).toHaveLength(1);
  });

  it("shows disabled state and tooltip triggers for coming-soon items", () => {
    const { container } = render(<SettingsNav role="admin" />);

    // Notifications is now an active link, only Security is disabled
    expect(screen.getByRole("link", { name: /notifications/i })).toBeInTheDocument();
    expect(screen.getByText("Security")).toHaveAttribute(
      "aria-disabled",
      "true"
    );

    const tooltipTriggers = container.querySelectorAll(
      "[data-slot='tooltip-trigger']"
    );
    expect(tooltipTriggers).toHaveLength(1);
  });

  it("shows only manager-allowed settings destinations", () => {
    render(<SettingsNav role="manager" />);

    expect(screen.queryByRole("link", { name: /general/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /members/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /data model/i })).toBeNull();
    expect(screen.getByRole("link", { name: /email connections/i })).toHaveAttribute(
      "href",
      "/settings/email-accounts"
    );
    expect(
      screen.getByRole("link", { name: /notifications/i })
    ).toHaveAttribute("href", "/settings/notifications");
    expect(screen.getByText("Security")).toBeInTheDocument();
  });

  it("applies glass card styling to the nav container", () => {
    const { container } = render(<SettingsNav role="admin" />);
    const nav = container.querySelector("nav");
    expect(nav).toBeInTheDocument();
  });
});
