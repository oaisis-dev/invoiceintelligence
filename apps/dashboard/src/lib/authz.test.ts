import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  accessNotProvisionedResponse,
  assertLocationAccess,
  assertRole,
  requireAuthContext,
} from "./authz";

const mockedAuth = vi.mocked(auth);
const mockedCreateServerClient = vi.mocked(createServerClient);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("authz", () => {
  it("returns ACCESS_NOT_PROVISIONED for unprovisioned users", async () => {
    mockedAuth.mockResolvedValue({ userId: "clerk-1" } as never);
    mockedCreateServerClient.mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          or: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({ data: null, error: null })),
          })),
        })),
      })),
    } as never);

    const result = await requireAuthContext();
    expect(result.context).toBeNull();
    expect(result.error?.status).toBe(403);
    await expect(result.error?.json()).resolves.toEqual(
      expect.objectContaining({
        error: expect.objectContaining({ code: "ACCESS_NOT_PROVISIONED" }),
      })
    );
  });

  it("allows org-wide managers to access invoices across locations", async () => {
    const response = assertLocationAccess(
      {
        role: "manager",
        locationId: "loc-1",
      } as never,
      "loc-2"
    );
    expect(response).toBeNull();
  });

  it("denies location scope when target location differs for location-scoped staff", async () => {
    const response = assertLocationAccess(
      {
        role: "staff",
        locationId: "loc-1",
      } as never,
      "loc-2"
    );
    expect(response?.status).toBe(403);
  });

  it("denies forbidden role for admin-only operation", async () => {
    const response = assertRole(
      {
        role: "staff",
      } as never,
      ["admin"]
    );
    expect(response?.status).toBe(403);
  });

  it("provides ACCESS_NOT_PROVISIONED response helper", async () => {
    const response = accessNotProvisionedResponse();
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        error: expect.objectContaining({ code: "ACCESS_NOT_PROVISIONED" }),
      })
    );
  });
});
