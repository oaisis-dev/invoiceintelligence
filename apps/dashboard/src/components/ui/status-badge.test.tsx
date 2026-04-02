import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StatusBadge } from "./status-badge";

describe("StatusBadge", () => {
  it("renders the status text", () => {
    render(<StatusBadge variant="success">Approved</StatusBadge>);
    expect(screen.getByText("Approved")).toBeInTheDocument();
  });

  it("applies success variant styles", () => {
    render(
      <StatusBadge variant="success" data-testid="badge">
        Approved
      </StatusBadge>
    );
    const badge = screen.getByTestId("badge");
    expect(badge.className).toContain("text-success");
  });

  it("applies warning variant styles", () => {
    render(
      <StatusBadge variant="warning" data-testid="badge">
        Ready for Review
      </StatusBadge>
    );
    const badge = screen.getByTestId("badge");
    expect(badge.className).toContain("text-text-primary");
  });

  it("applies error variant styles", () => {
    render(
      <StatusBadge variant="error" data-testid="badge">
        Failed
      </StatusBadge>
    );
    const badge = screen.getByTestId("badge");
    expect(badge.className).toContain("text-error");
  });

  it("renders as a pill (rounded-full)", () => {
    render(
      <StatusBadge variant="success" data-testid="badge">
        Exported
      </StatusBadge>
    );
    expect(screen.getByTestId("badge")).toHaveClass("rounded-full");
  });

  it("merges custom className", () => {
    render(
      <StatusBadge variant="success" className="ml-2" data-testid="badge">
        Done
      </StatusBadge>
    );
    expect(screen.getByTestId("badge")).toHaveClass("ml-2");
  });
});
