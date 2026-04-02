import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Location, Organization } from "@/types/database";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

// ---------------------------------------------------------------------------
// Mock the Supabase query layer and API client
// ---------------------------------------------------------------------------

const mockOrg: Organization = {
  id: "org-1",
  name: "Twin Peaks Restaurant",
  slug: "twin-peaks",
  workspace_type: "organization",
  logo_url: null,
  settings: {
    default_export_format: "xlsx",
    auto_approve_threshold: 95,
    export_routing: {
      mode: "org_wide",
      org_default_destination: "gsheets://finance/main",
      location_overrides: {},
    },
  },
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const mockLocations: Pick<Location, "id" | "name" | "is_active">[] = [
  { id: "loc-1", name: "Downtown", is_active: true },
  { id: "loc-2", name: "Airport", is_active: true },
];

vi.mock("@/lib/queries/settings", () => ({
  getCurrentUserRole: vi.fn(),
  getOrgSettingsBundle: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  updateOrgSettings: vi.fn(),
}));

// Mock sonner to prevent portal issues
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { redirect } from "next/navigation";
import {
  getCurrentUserRole,
  getOrgSettingsBundle,
} from "@/lib/queries/settings";
import GeneralSettingsPage from "./page";

const mockedRedirect = vi.mocked(redirect);
const mockedGetCurrentUserRole = vi.mocked(getCurrentUserRole);
const mockedGetOrgSettingsBundle = vi.mocked(getOrgSettingsBundle);

beforeEach(() => {
  vi.clearAllMocks();
  mockedGetCurrentUserRole.mockResolvedValue("admin");
  mockedGetOrgSettingsBundle.mockResolvedValue({
    organization: mockOrg,
    locations: mockLocations,
  });
});

describe("GeneralSettingsPage", () => {
  it("redirects managers to data model", async () => {
    mockedGetCurrentUserRole.mockResolvedValue("manager");

    await expect(GeneralSettingsPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockedRedirect).toHaveBeenCalledWith("/settings/data-model");
  });

  describe("Organization Information card", () => {
    it("renders the Organization Information heading", async () => {
      const Component = await GeneralSettingsPage();
      render(Component);
      expect(
        screen.getByText("Organization Information")
      ).toBeInTheDocument();
    });

    it("renders Organization Name input with value from query", async () => {
      const Component = await GeneralSettingsPage();
      render(Component);

      const input = screen.getByLabelText("Organization Name");
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue("Twin Peaks Restaurant");
    });
  });

  describe("Export & Processing card", () => {
    it("renders the Export & Processing heading", async () => {
      const Component = await GeneralSettingsPage();
      render(Component);
      expect(
        screen.getByText("Export & Processing")
      ).toBeInTheDocument();
    });

    it("renders Default Export Format selector", async () => {
      const Component = await GeneralSettingsPage();
      render(Component);

      const select = screen.getByLabelText("Default Export Format");
      expect(select).toBeInTheDocument();
    });

    it("renders Auto-Approve Threshold input", async () => {
      const Component = await GeneralSettingsPage();
      render(Component);

      const input = screen.getByLabelText("Auto-Approve Threshold (%)");
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue(95);
    });
  });

  describe("Export Routing card", () => {
    it("renders export routing controls", async () => {
      const Component = await GeneralSettingsPage();
      render(Component);

      expect(screen.getByText("Export Routing")).toBeInTheDocument();
      expect(screen.getByLabelText("Routing Mode")).toBeInTheDocument();
      expect(
        screen.getByLabelText("Organization Default Destination")
      ).toBeInTheDocument();
    });
  });

  describe("Save Changes button", () => {
    it("renders the Save Changes button", async () => {
      const Component = await GeneralSettingsPage();
      render(Component);

      const button = screen.getByRole("button", { name: /save changes/i });
      expect(button).toBeInTheDocument();
    });

    it("has a Save icon inside the button", async () => {
      const Component = await GeneralSettingsPage();
      render(Component);

      const button = screen.getByRole("button", { name: /save changes/i });
      const svg = button.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });
  });

  describe("null org fallback", () => {
    it("renders with empty values when org is null", async () => {
      mockedGetOrgSettingsBundle.mockResolvedValue({
        organization: null,
        locations: [],
      });
      const Component = await GeneralSettingsPage();
      render(Component);

      const input = screen.getByLabelText("Organization Name");
      expect(input).toHaveValue("");
    });
  });
});
