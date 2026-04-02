import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SourceBadge } from "./source-badge";

// Note: SourceBadge uses Tooltip from @radix-ui, which renders via Portal.
// In jsdom tests, tooltip content won't appear in the document unless
// we simulate hover. We test the visible badge content directly.

describe("SourceBadge", () => {
  it("renders 'Web Upload' text for web_upload source", () => {
    render(<SourceBadge source="web_upload" />);
    expect(screen.getByText("Web Upload")).toBeInTheDocument();
  });

  it("renders 'Email' text for email source", () => {
    render(<SourceBadge source="email" />);
    expect(screen.getByText("Email")).toBeInTheDocument();
  });

  it("renders an Upload icon (hidden) for web_upload", () => {
    const { container } = render(<SourceBadge source="web_upload" />);
    const icon = container.querySelector("[aria-hidden='true']");
    expect(icon).toBeInTheDocument();
  });

  it("renders a Mail icon (hidden) for email", () => {
    const { container } = render(<SourceBadge source="email" />);
    const icon = container.querySelector("[aria-hidden='true']");
    expect(icon).toBeInTheDocument();
  });

  it("applies blue styles for email source", () => {
    const { container } = render(<SourceBadge source="email" />);
    const badge = container.querySelector("span");
    expect(badge?.className).toContain("bg-blue-50");
    expect(badge?.className).toContain("text-blue-700");
  });

  it("applies muted styles for web_upload source", () => {
    const { container } = render(<SourceBadge source="web_upload" />);
    const badge = container.querySelector("span");
    expect(badge?.className).toContain("bg-muted");
    expect(badge?.className).toContain("text-muted-foreground");
  });

  it("merges custom className", () => {
    const { container } = render(
      <SourceBadge source="web_upload" className="ml-4" />
    );
    const badge = container.querySelector("span");
    expect(badge?.className).toContain("ml-4");
  });

  it("renders as a pill (rounded-full)", () => {
    const { container } = render(<SourceBadge source="email" />);
    const badge = container.querySelector("span");
    expect(badge?.className).toContain("rounded-full");
  });

  it("does not wrap email badge in tooltip when no senderEmail", () => {
    const { container } = render(<SourceBadge source="email" />);
    // When there's no tooltip, the badge is rendered directly (no trigger wrapper)
    const tooltipTrigger = container.querySelector(
      "[data-slot='tooltip-trigger']"
    );
    expect(tooltipTrigger).not.toBeInTheDocument();
  });

  it("wraps email badge in tooltip when senderEmail is provided", () => {
    const { container } = render(
      <SourceBadge source="email" senderEmail="invoices@sysco.com" />
    );
    // When senderEmail is provided, the badge is wrapped in a Tooltip > TooltipTrigger
    const tooltipTrigger = container.querySelector(
      "[data-slot='tooltip-trigger']"
    );
    expect(tooltipTrigger).toBeInTheDocument();
  });

  it("does not wrap web_upload badge in tooltip even with senderEmail", () => {
    const { container } = render(
      <SourceBadge source="web_upload" senderEmail="someone@example.com" />
    );
    const tooltipTrigger = container.querySelector(
      "[data-slot='tooltip-trigger']"
    );
    expect(tooltipTrigger).not.toBeInTheDocument();
  });
});
