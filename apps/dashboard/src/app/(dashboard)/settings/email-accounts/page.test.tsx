import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("@/lib/queries/settings", () => ({
  getCurrentUserRole: vi.fn(),
}));

vi.mock("./email-accounts-client", () => ({
  EmailAccountsClient: ({ role }: { role: "admin" | "manager" | "staff" | null }) => (
    <div data-testid="email-accounts-client">role:{role ?? "none"}</div>
  ),
}));

import { redirect } from "next/navigation";
import { getCurrentUserRole } from "@/lib/queries/settings";
import EmailAccountsPage from "./page";

const mockedRedirect = vi.mocked(redirect);
const mockedGetCurrentUserRole = vi.mocked(getCurrentUserRole);

beforeEach(() => {
  vi.clearAllMocks();
  mockedGetCurrentUserRole.mockResolvedValue("admin");
});

describe("EmailAccountsPage", () => {
  it("renders email intake for owners", async () => {
    const Component = await EmailAccountsPage();
    render(Component);

    expect(screen.getByTestId("email-accounts-client")).toHaveTextContent(
      "role:admin"
    );
  });

  it("renders email intake for managers in read-only mode", async () => {
    mockedGetCurrentUserRole.mockResolvedValue("manager");

    const Component = await EmailAccountsPage();
    render(Component);

    expect(screen.getByTestId("email-accounts-client")).toHaveTextContent(
      "role:manager"
    );
  });

  it("redirects staff away from email intake", async () => {
    mockedGetCurrentUserRole.mockResolvedValue("staff");

    await expect(EmailAccountsPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockedRedirect).toHaveBeenCalledWith("/invoices");
  });
});
