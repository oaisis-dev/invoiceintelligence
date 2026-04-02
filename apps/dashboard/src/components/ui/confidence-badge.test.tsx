import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ConfidenceBadge } from "./confidence-badge";

describe("ConfidenceBadge", () => {
  it("renders 'High' level text", () => {
    render(<ConfidenceBadge level="high" />);
    expect(screen.getByText("High")).toBeInTheDocument();
  });

  it("renders 'Medium' level text", () => {
    render(<ConfidenceBadge level="medium" />);
    expect(screen.getByText("Medium")).toBeInTheDocument();
  });

  it("renders 'Low' level text", () => {
    render(<ConfidenceBadge level="low" />);
    expect(screen.getByText("Low")).toBeInTheDocument();
  });

  it("renders a colored dot indicator", () => {
    render(<ConfidenceBadge level="high" data-testid="badge" />);
    const badge = screen.getByTestId("badge");
    const dot = badge.querySelector("[data-slot='confidence-dot']");
    expect(dot).toBeInTheDocument();
  });

  it("applies high confidence color (green)", () => {
    render(<ConfidenceBadge level="high" data-testid="badge" />);
    const badge = screen.getByTestId("badge");
    expect(badge.className).toContain("bg-primary-10");
    expect(badge.className).toContain("text-primary");
  });

  it("applies low confidence color (red)", () => {
    render(<ConfidenceBadge level="low" data-testid="badge" />);
    const badge = screen.getByTestId("badge");
    expect(badge.className).toContain("bg-error-10");
    expect(badge.className).toContain("text-error");
  });

  it("renders as a pill shape", () => {
    render(<ConfidenceBadge level="medium" data-testid="badge" />);
    expect(screen.getByTestId("badge")).toHaveClass("rounded-full");
  });

  it("merges custom className", () => {
    render(
      <ConfidenceBadge level="high" className="ml-4" data-testid="badge" />
    );
    expect(screen.getByTestId("badge")).toHaveClass("ml-4");
  });
});
