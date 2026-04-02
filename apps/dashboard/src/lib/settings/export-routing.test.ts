import { describe, expect, it } from "vitest";
import {
  parseOrgSettings,
  resolveExportDestination,
  validateExportRouting,
} from "./export-routing";

describe("parseOrgSettings", () => {
  it("applies defaults for missing values", () => {
    const parsed = parseOrgSettings({});

    expect(parsed.default_export_format).toBe("xlsx");
    expect(parsed.auto_approve_threshold).toBe(95);
    expect(parsed.export_routing.mode).toBe("org_wide");
    expect(parsed.export_routing.org_default_destination).toBe("");
  });
});

describe("validateExportRouting", () => {
  it("rejects missing org default destination", () => {
    const result = validateExportRouting(
      {
        mode: "org_wide",
        org_default_destination: "",
        location_overrides: {},
      },
      []
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Organization default destination is required.");
  });

  it("rejects unknown location override keys", () => {
    const result = validateExportRouting(
      {
        mode: "per_location",
        org_default_destination: "gsheets://main",
        location_overrides: {
          "loc-x": "gsheets://loc-x",
        },
      },
      ["loc-a", "loc-b"]
    );

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("unknown location");
  });
});

describe("resolveExportDestination", () => {
  const config = {
    mode: "per_location" as const,
    org_default_destination: "gsheets://default",
    location_overrides: {
      "loc-1": "gsheets://loc-1",
    },
  };

  it("returns location override when available", () => {
    const result = resolveExportDestination(config, "loc-1");
    expect(result).toEqual({
      destination: "gsheets://loc-1",
      source: "location_override",
    });
  });

  it("falls back to org default when location override is missing", () => {
    const result = resolveExportDestination(config, "loc-2");
    expect(result).toEqual({
      destination: "gsheets://default",
      source: "org_default",
    });
  });
});

