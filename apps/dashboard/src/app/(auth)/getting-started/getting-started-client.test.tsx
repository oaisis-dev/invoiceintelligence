import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GettingStartedClient } from "./getting-started-client";

const replace = vi.fn();
const reload = vi.fn();
const router = {
  replace,
};
const session = {
  reload,
};
const searchParams = {
  get: vi.fn(() => null),
};

vi.mock("@clerk/nextjs", () => ({
  useClerk: () => ({
    session,
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => searchParams,
}));

describe("GettingStartedClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the invite claim error visible instead of reloading the invitation state", async () => {
    let statusRequestCount = 0;
    let claimRequestCount = 0;
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      if (url.includes("/api/auth/status")) {
        statusRequestCount += 1;
        return {
          ok: true,
          json: async () => ({
            provisioned: false,
            email: "manager-org@example.com",
            displayName: "Manager User",
            suggestedIndividualWorkspaceName: "Manager User's Workspace",
            suggestedOrganizationWorkspaceName: "Manager User Org",
            pendingInvitations: [
              {
                id: "invite-1",
                org_id: "org-1",
                organization_name: "Beta Org",
                organization_slug: "beta-org",
                workspace_type: "organization",
                email: "manager-org@example.com",
                role: "manager",
                expires_at: "2026-03-20T12:00:00Z",
                invited_by_label: "Owner User",
              },
            ],
            highlightedInvitationId: "invite-1",
            inviteLookupError: null,
          }),
        };
      }

      if (url.includes("/api/auth/invitations/claim")) {
        claimRequestCount += 1;
        return {
          ok: false,
          json: async () => ({
            error: {
              message: "This Clerk account is already provisioned for a workspace.",
            },
          }),
        };
      }

      throw new Error(`Unexpected fetch URL: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<GettingStartedClient />);

    expect(
      await screen.findByRole("heading", { name: "Join an organization" })
    ).toBeInTheDocument();

    const statusRequestsBeforeClaim = statusRequestCount;

    await userEvent.click(
      screen.getByRole("button", { name: "Join workspace" })
    );

    expect(
      await screen.findByText(
        "This Clerk account is already provisioned for a workspace."
      )
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(claimRequestCount).toBe(1);
    });

    expect(statusRequestCount).toBe(statusRequestsBeforeClaim);
    expect(replace).not.toHaveBeenCalled();
  });
});
