import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { FileX, Upload, Inbox } from "lucide-react";
import { EmptyState } from "./empty-state";

describe("EmptyState", () => {
  // ---------------------------------------------------------------------------
  // Basic rendering
  // ---------------------------------------------------------------------------

  it("renders the title text", () => {
    render(
      <EmptyState
        icon={<FileX className="size-6" />}
        title="No invoices found"
        description="Upload your first invoice to get started."
      />
    );
    expect(screen.getByText("No invoices found")).toBeInTheDocument();
  });

  it("renders the description text", () => {
    render(
      <EmptyState
        icon={<FileX className="size-6" />}
        title="No invoices found"
        description="Upload your first invoice to get started."
      />
    );
    expect(
      screen.getByText("Upload your first invoice to get started.")
    ).toBeInTheDocument();
  });

  it("renders the icon container as aria-hidden", () => {
    const { container } = render(
      <EmptyState
        icon={<Upload className="size-6" />}
        title="No uploads"
        description="Drag and drop PDFs to upload."
      />
    );
    const iconContainer = container.querySelector("[aria-hidden='true']");
    expect(iconContainer).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Action button — with href (link)
  // ---------------------------------------------------------------------------

  it("renders a link action button when href is provided", () => {
    render(
      <EmptyState
        icon={<Upload className="size-6" />}
        title="No invoices"
        description="Start by uploading."
        action={{ label: "Upload Invoice", href: "/upload" }}
      />
    );
    const link = screen.getByRole("link", { name: "Upload Invoice" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/upload");
  });

  // ---------------------------------------------------------------------------
  // Action button — with onClick (button)
  // ---------------------------------------------------------------------------

  it("renders a button action when onClick is provided", () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        icon={<Inbox className="size-6" />}
        title="No emails"
        description="Check your inbox configuration."
        action={{ label: "Configure Email", onClick }}
      />
    );
    expect(
      screen.getByRole("button", { name: "Configure Email" })
    ).toBeInTheDocument();
  });

  it("fires onClick when the action button is clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <EmptyState
        icon={<Inbox className="size-6" />}
        title="No emails"
        description="Check your inbox configuration."
        action={{ label: "Configure Email", onClick }}
      />
    );

    await user.click(
      screen.getByRole("button", { name: "Configure Email" })
    );
    expect(onClick).toHaveBeenCalledOnce();
  });

  // ---------------------------------------------------------------------------
  // No action
  // ---------------------------------------------------------------------------

  it("does not render an action area when action is omitted", () => {
    render(
      <EmptyState
        icon={<FileX className="size-6" />}
        title="Nothing here"
        description="No data to display."
      />
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Custom className
  // ---------------------------------------------------------------------------

  it("merges custom className onto the container div", () => {
    const { container } = render(
      <EmptyState
        icon={<FileX className="size-6" />}
        title="Empty"
        description="No data."
        className="my-custom-class"
      />
    );
    const wrapper = container.firstElementChild;
    expect(wrapper?.className).toContain("my-custom-class");
  });
});
