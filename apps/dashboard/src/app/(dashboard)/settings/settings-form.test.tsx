import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { SettingsForm } from "./settings-form";
import type { Organization } from "@/types/database";

const mockUpdateOrgSettings = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock("@/lib/api-client", () => ({
  updateOrgSettings: (...args: unknown[]) => mockUpdateOrgSettings(...args),
}));

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

const mockOrg: Organization = {
  id: "org-1",
  name: "OAISIS",
  slug: "oaisis",
  workspace_type: "organization",
  logo_url: null,
  settings: {
    default_export_format: "xlsx",
    auto_approve_threshold: 90,
    export_routing: {
      mode: "org_wide",
      org_default_destination: "gsheets://default",
      location_overrides: {},
    },
  },
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const mockLocations = [
  { id: "loc-1", name: "Downtown", is_active: true },
  { id: "loc-2", name: "Airport", is_active: true },
];

describe("SettingsForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateOrgSettings.mockResolvedValue({
      organization: mockOrg,
      locations: mockLocations,
    });
  });

  it("renders export routing controls", () => {
    render(<SettingsForm org={mockOrg} locations={mockLocations} />);

    expect(screen.getByLabelText("Routing Mode")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Organization Default Destination")
    ).toBeInTheDocument();
  });

  it("shows per-location destination fields when mode is per_location", async () => {
    const user = userEvent.setup();
    render(<SettingsForm org={mockOrg} locations={mockLocations} />);

    await user.click(screen.getByLabelText("Routing Mode"));
    await user.click(
      await screen.findByRole("option", {
        name: "Per-location with fallback",
      })
    );

    expect(screen.getByLabelText("Downtown")).toBeInTheDocument();
    expect(screen.getByLabelText("Airport")).toBeInTheDocument();
  });

  it("saves routing payload to API", async () => {
    const user = userEvent.setup();
    render(<SettingsForm org={mockOrg} locations={mockLocations} />);

    await user.click(screen.getByLabelText("Routing Mode"));
    await user.click(
      await screen.findByRole("option", {
        name: "Per-location with fallback",
      })
    );
    fireEvent.change(screen.getByLabelText("Organization Default Destination"), {
      target: { value: "gsheets://org-default" },
    });
    fireEvent.change(screen.getByLabelText("Downtown"), {
      target: { value: "gsheets://downtown" },
    });

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(mockUpdateOrgSettings).toHaveBeenCalledTimes(1);
    });

    expect(mockUpdateOrgSettings).toHaveBeenCalledWith({
      name: "OAISIS",
      settings: expect.objectContaining({
        export_routing: {
          mode: "per_location",
          org_default_destination: "gsheets://org-default",
          location_overrides: {
            "loc-1": "gsheets://downtown",
          },
        },
      }),
    });
    expect(mockToastSuccess).toHaveBeenCalledWith("Settings saved successfully");
  });

  it("shows backend validation errors from API", async () => {
    mockUpdateOrgSettings.mockRejectedValue(new Error("Invalid export routing configuration"));

    render(<SettingsForm org={mockOrg} locations={mockLocations} />);

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        "Invalid export routing configuration"
      );
    });
  });
});
