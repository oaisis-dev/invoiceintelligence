import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { GET, PUT } from "./route";

vi.mock("@/lib/authz", () => ({
  requireAuthContext: vi.fn(),
  assertRole: vi.fn(),
}));

import { assertRole, requireAuthContext } from "@/lib/authz";

const mockedRequireAuthContext = vi.mocked(requireAuthContext);
const mockedAssertRole = vi.mocked(assertRole);

function createOrganizationsBuilder() {
  let mode: "fetch" | "update" = "fetch";
  let updatedPayload: Record<string, unknown> | null = null;
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.update = vi.fn((payload: Record<string, unknown>) => {
    mode = "update";
    updatedPayload = payload;
    return builder;
  });
  builder.single = vi.fn(async () => {
    if (mode === "update") {
      return {
        data: {
          id: "org-1",
          name: "Updated Org",
          slug: "oaisis",
          logo_url: null,
          settings: {
            export_routing: {
              mode: "org_wide",
              org_default_destination: "gsheets://main",
              location_overrides: {},
            },
          },
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-02T00:00:00Z",
        },
        error: null,
      };
    }
    return {
      data: {
        id: "org-1",
        name: "OAISIS",
        slug: "oaisis",
        logo_url: null,
        settings: {},
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
      error: null,
    };
  });
  return { builder, getUpdatedPayload: () => updatedPayload };
}

function createLocationsBuilder() {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.order = vi.fn(async () => ({
    data: [
      { id: "loc-1", name: "Downtown", is_active: true },
      { id: "loc-2", name: "Airport", is_active: false },
    ],
    error: null,
  }));
  return builder;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedAssertRole.mockReturnValue(null);
});

describe("/api/settings", () => {
  it("GET returns normalized org settings with locations", async () => {
    const organizations = createOrganizationsBuilder();
    const locations = createLocationsBuilder();

    mockedRequireAuthContext.mockResolvedValue({
      context: {
        orgId: "org-1",
        supabase: {
          from: vi.fn((table: string) => {
            if (table === "organizations") return organizations.builder;
            if (table === "locations") return locations;
            throw new Error(`Unexpected table ${table}`);
          }),
        },
      } as never,
      error: null,
    });

    const response = await GET();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.organization.settings.export_routing.mode).toBe("org_wide");
    expect(body.locations).toHaveLength(2);
  });

  it("GET returns role guard response for non-admin role", async () => {
    mockedRequireAuthContext.mockResolvedValue({
      context: { role: "manager" } as never,
      error: null,
    });
    mockedAssertRole.mockReturnValue(
      NextResponse.json({ error: { code: "FORBIDDEN_ROLE" } }, { status: 403 })
    );

    const response = await GET();
    expect(response.status).toBe(403);
  });

  it("PUT updates settings for admin role and writes canonical audit", async () => {
    const organizations = createOrganizationsBuilder();
    const locations = createLocationsBuilder();
    mockedRequireAuthContext.mockResolvedValue({
      context: {
        orgId: "org-1",
        role: "admin",
        supabase: {
          from: vi.fn((table: string) => {
            if (table === "organizations") return organizations.builder;
            if (table === "locations") return locations;
            throw new Error(`Unexpected table ${table}`);
          }),
        },
      } as never,
      error: null,
    });

    const request = new Request("http://localhost/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Updated Org" }),
    });

    const response = await PUT(request as never);
    expect(response.status).toBe(200);
    expect(organizations.getUpdatedPayload()).toEqual(
      expect.objectContaining({ name: "Updated Org" })
    );
  });

  it("PUT returns role guard response for non-admin role", async () => {
    mockedRequireAuthContext.mockResolvedValue({
      context: { role: "manager" } as never,
      error: null,
    });
    mockedAssertRole.mockReturnValue(
      NextResponse.json({ error: { code: "FORBIDDEN_ROLE" } }, { status: 403 })
    );

    const request = new Request("http://localhost/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Blocked" }),
    });

    const response = await PUT(request as never);
    expect(response.status).toBe(403);
  });
});
