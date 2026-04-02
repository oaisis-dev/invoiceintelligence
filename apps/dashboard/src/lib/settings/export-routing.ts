export type ExportRoutingMode = "org_wide" | "per_location";

export type ExportRoutingConfig = {
  mode: ExportRoutingMode;
  org_default_destination: string;
  location_overrides: Record<string, string>;
};

export type OrgSettings = {
  default_export_format: "xlsx" | "csv";
  auto_approve_threshold: number;
  export_routing: ExportRoutingConfig;
};

export type ExportRoutingValidationResult = {
  valid: boolean;
  errors: string[];
};

export type ExportDestinationResolution = {
  destination: string | null;
  source: "location_override" | "org_default" | "none";
};

const DEFAULT_SETTINGS: OrgSettings = {
  default_export_format: "xlsx",
  auto_approve_threshold: 95,
  export_routing: {
    mode: "org_wide",
    org_default_destination: "",
    location_overrides: {},
  },
};

function trimOrEmpty(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseLocationOverrides(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const entries = Object.entries(value as Record<string, unknown>);
  const parsed: Record<string, string> = {};
  for (const [locationId, destination] of entries) {
    parsed[locationId] = trimOrEmpty(destination);
  }
  return parsed;
}

export function parseOrgSettings(raw: Record<string, unknown>): OrgSettings {
  const s = raw as Partial<OrgSettings>;

  const exportRoutingRaw =
    s.export_routing && typeof s.export_routing === "object"
      ? (s.export_routing as Partial<ExportRoutingConfig>)
      : {};

  return {
    default_export_format:
      s.default_export_format === "csv" ? "csv" : DEFAULT_SETTINGS.default_export_format,
    auto_approve_threshold:
      typeof s.auto_approve_threshold === "number"
        ? s.auto_approve_threshold
        : DEFAULT_SETTINGS.auto_approve_threshold,
    export_routing: {
      mode:
        exportRoutingRaw.mode === "per_location"
          ? "per_location"
          : DEFAULT_SETTINGS.export_routing.mode,
      org_default_destination: trimOrEmpty(
        exportRoutingRaw.org_default_destination
      ),
      location_overrides: parseLocationOverrides(
        exportRoutingRaw.location_overrides
      ),
    },
  };
}

export function validateExportRouting(
  config: ExportRoutingConfig,
  activeLocationIds: string[]
): ExportRoutingValidationResult {
  const errors: string[] = [];

  if (!config.org_default_destination.trim()) {
    errors.push("Organization default destination is required.");
  }

  const activeLocationIdSet = new Set(activeLocationIds);
  for (const [locationId, destination] of Object.entries(
    config.location_overrides
  )) {
    if (!activeLocationIdSet.has(locationId)) {
      errors.push(`Location override references unknown location: ${locationId}`);
      continue;
    }

    if (!destination.trim()) {
      errors.push(`Location override destination is empty for location: ${locationId}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function resolveExportDestination(
  config: ExportRoutingConfig,
  invoiceLocationId: string | null
): ExportDestinationResolution {
  const orgDefault = config.org_default_destination.trim();

  if (config.mode === "per_location" && invoiceLocationId) {
    const locationOverride = config.location_overrides[invoiceLocationId]?.trim();
    if (locationOverride) {
      return {
        destination: locationOverride,
        source: "location_override",
      };
    }
  }

  if (orgDefault) {
    return {
      destination: orgDefault,
      source: "org_default",
    };
  }

  return {
    destination: null,
    source: "none",
  };
}

