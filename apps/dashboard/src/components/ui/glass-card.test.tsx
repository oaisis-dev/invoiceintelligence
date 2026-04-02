import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { GlassCard, GlassCardHeader, GlassCardContent } from "./glass-card";

describe("GlassCard", () => {
  it("renders children", () => {
    render(<GlassCard>Card content</GlassCard>);
    expect(screen.getByText("Card content")).toBeInTheDocument();
  });

  it("applies glass morphism classes", () => {
    render(<GlassCard data-testid="card">Content</GlassCard>);
    const card = screen.getByTestId("card");
    expect(card).toHaveClass("bg-white/70");
    expect(card).toHaveClass("border-white/20");
    expect(card).toHaveClass("rounded-2xl");
  });

  it("merges custom className", () => {
    render(
      <GlassCard data-testid="card" className="mt-4">
        Content
      </GlassCard>
    );
    const card = screen.getByTestId("card");
    expect(card).toHaveClass("mt-4");
  });

  it("forwards ref", () => {
    let ref: HTMLDivElement | null = null;
    render(
      <GlassCard ref={(el) => { ref = el; }}>
        Content
      </GlassCard>
    );
    expect(ref).toBeInstanceOf(HTMLDivElement);
  });

  it("passes through HTML attributes", () => {
    render(
      <GlassCard data-testid="card" aria-label="stats card">
        Content
      </GlassCard>
    );
    expect(screen.getByTestId("card")).toHaveAttribute(
      "aria-label",
      "stats card"
    );
  });
});

describe("GlassCardHeader", () => {
  it("renders children", () => {
    render(<GlassCardHeader>Header</GlassCardHeader>);
    expect(screen.getByText("Header")).toBeInTheDocument();
  });
});

describe("GlassCardContent", () => {
  it("renders children", () => {
    render(<GlassCardContent>Body</GlassCardContent>);
    expect(screen.getByText("Body")).toBeInTheDocument();
  });
});
