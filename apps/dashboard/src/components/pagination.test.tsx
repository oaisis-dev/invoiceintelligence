import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Pagination } from "./pagination";

describe("Pagination", () => {
  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  it("returns null when totalPages is 1", () => {
    const { container } = render(
      <Pagination currentPage={1} totalPages={1} onPageChange={vi.fn()} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("returns null when totalPages is 0", () => {
    const { container } = render(
      <Pagination currentPage={1} totalPages={0} onPageChange={vi.fn()} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders a nav element with pagination role", () => {
    render(
      <Pagination currentPage={1} totalPages={3} onPageChange={vi.fn()} />
    );
    expect(screen.getByRole("navigation", { name: "Pagination" })).toBeInTheDocument();
  });

  it("renders all page numbers for <= 5 pages", () => {
    render(
      <Pagination currentPage={2} totalPages={4} onPageChange={vi.fn()} />
    );
    expect(screen.getByRole("button", { name: "Go to page 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to page 2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to page 3" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to page 4" })).toBeInTheDocument();
  });

  it("renders previous and next buttons", () => {
    render(
      <Pagination currentPage={1} totalPages={3} onPageChange={vi.fn()} />
    );
    expect(screen.getByRole("button", { name: "Go to previous page" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to next page" })).toBeInTheDocument();
  });

  it("disables previous button on first page", () => {
    render(
      <Pagination currentPage={1} totalPages={5} onPageChange={vi.fn()} />
    );
    expect(screen.getByRole("button", { name: "Go to previous page" })).toBeDisabled();
  });

  it("disables next button on last page", () => {
    render(
      <Pagination currentPage={5} totalPages={5} onPageChange={vi.fn()} />
    );
    expect(screen.getByRole("button", { name: "Go to next page" })).toBeDisabled();
  });

  it("marks current page with aria-current='page'", () => {
    render(
      <Pagination currentPage={3} totalPages={5} onPageChange={vi.fn()} />
    );
    const current = screen.getByRole("button", { name: "Go to page 3" });
    expect(current).toHaveAttribute("aria-current", "page");
  });

  it("does not set aria-current on non-current pages", () => {
    render(
      <Pagination currentPage={3} totalPages={5} onPageChange={vi.fn()} />
    );
    const other = screen.getByRole("button", { name: "Go to page 1" });
    expect(other).not.toHaveAttribute("aria-current");
  });

  // ---------------------------------------------------------------------------
  // Ellipsis
  // ---------------------------------------------------------------------------

  it("shows ellipsis for many pages when current is near the start", () => {
    render(
      <Pagination currentPage={1} totalPages={10} onPageChange={vi.fn()} />
    );
    // Should show: 1, 2, ..., 10
    expect(screen.getByRole("button", { name: "Go to page 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to page 2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to page 10" })).toBeInTheDocument();
    // At least one ellipsis
    expect(screen.getAllByText("...").length).toBeGreaterThanOrEqual(1);
  });

  it("shows ellipsis on both sides when current is in the middle", () => {
    render(
      <Pagination currentPage={5} totalPages={10} onPageChange={vi.fn()} />
    );
    // Should show: 1, ..., 4, 5, 6, ..., 10
    const ellipses = screen.getAllByText("...");
    expect(ellipses.length).toBe(2);
  });

  // ---------------------------------------------------------------------------
  // Click handling
  // ---------------------------------------------------------------------------

  it("calls onPageChange when clicking a page number", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <Pagination currentPage={1} totalPages={5} onPageChange={onPageChange} />
    );

    await user.click(screen.getByRole("button", { name: "Go to page 3" }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("calls onPageChange when clicking next", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <Pagination currentPage={2} totalPages={5} onPageChange={onPageChange} />
    );

    await user.click(screen.getByRole("button", { name: "Go to next page" }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("calls onPageChange when clicking previous", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <Pagination currentPage={3} totalPages={5} onPageChange={onPageChange} />
    );

    await user.click(
      screen.getByRole("button", { name: "Go to previous page" })
    );
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  // ---------------------------------------------------------------------------
  // Custom className
  // ---------------------------------------------------------------------------

  it("merges custom className on nav", () => {
    render(
      <Pagination
        currentPage={1}
        totalPages={3}
        onPageChange={vi.fn()}
        className="mt-4"
      />
    );
    const nav = screen.getByRole("navigation", { name: "Pagination" });
    expect(nav).toHaveClass("mt-4");
  });
});
