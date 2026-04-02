import {
  parseOrgSettings,
  validateExportRouting,
} from "@/lib/settings/export-routing";
import { NextRequest, NextResponse } from "next/server";
import { assertRole, type AuthContext, requireAuthContext } from "@/lib/authz";
import { appendActivityEvent } from "@/lib/activity-events";

async function getOrgContext(context: AuthContext) {
  const { data: organization, error: orgError } = await context.supabase
    .from("organizations")
    .select("id, name, slug, logo_url, settings, created_at, updated_at")
    .eq("id", context.orgId)
    .single();

  if (orgError || !organization) {
    return {
      error: NextResponse.json(
        { error: { message: "Organization not found" } },
        { status: 404 }
      ),
      organization: null,
      locations: [],
    };
  }

  const { data: locations, error: locationsError } = await context.supabase
    .from("locations")
    .select("id, name, is_active")
    .eq("org_id", context.orgId)
    .order("name", { ascending: true });

  if (locationsError) {
    return {
      error: NextResponse.json(
        {
          error: {
            message: `Failed to fetch organization locations: ${locationsError.message}`,
          },
        },
        { status: 500 }
      ),
      organization: null,
      locations: [],
    };
  }

  return {
    error: null,
    organization,
    locations: (locations ?? []) as Array<{
      id: string;
      name: string;
      is_active: boolean;
    }>,
  };
}

function normalizeOrganizationSettings(
  organization: Record<string, unknown>
): Record<string, unknown> {
  return {
    ...organization,
    settings: parseOrgSettings(
      (organization.settings ?? {}) as Record<string, unknown>
    ),
  };
}

export async function GET() {
  const authResult = await requireAuthContext();
  if (authResult.error) {
    return authResult.error;
  }
  const { context } = authResult;

  const roleError = assertRole(context, ["admin"]);
  if (roleError) {
    return roleError;
  }

  const orgContext = await getOrgContext(context);
  if (orgContext.error) {
    return orgContext.error;
  }

  return NextResponse.json({
    organization: normalizeOrganizationSettings(orgContext.organization),
    locations: orgContext.locations,
  });
}

export async function PUT(request: NextRequest) {
  const authResult = await requireAuthContext();
  if (authResult.error) {
    return authResult.error;
  }
  const { context } = authResult;

  const roleError = assertRole(context, ["admin"]);
  if (roleError) {
    return roleError;
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  const orgContext = await getOrgContext(context);
  if (orgContext.error) {
    return orgContext.error;
  }

  const updates: Record<string, unknown> = {};
  const name = body.name;
  const incomingSettings = body.settings;

  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        {
          error: {
            message: "Organization name must be a non-empty string",
          },
        },
        { status: 400 }
      );
    }
    updates.name = name.trim();
  }

  if (incomingSettings !== undefined) {
    if (
      typeof incomingSettings !== "object" ||
      incomingSettings === null ||
      Array.isArray(incomingSettings)
    ) {
      return NextResponse.json(
        {
          error: {
            message: "settings must be an object",
          },
        },
        { status: 400 }
      );
    }

    const existingSettings = (orgContext.organization.settings ?? {}) as Record<
      string,
      unknown
    >;
    const mergedSettings = {
      ...existingSettings,
      ...(incomingSettings as Record<string, unknown>),
    };
    const parsedSettings = parseOrgSettings(mergedSettings);

    const validation = validateExportRouting(
      parsedSettings.export_routing,
      orgContext.locations.map((location) => location.id)
    );
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: {
            message: "Invalid export routing configuration",
            details: validation.errors,
          },
        },
        { status: 400 }
      );
    }

    updates.settings = {
      ...mergedSettings,
      ...parsedSettings,
    };
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: { message: "No valid fields to update. Allowed: name, settings" } },
      { status: 400 }
    );
  }

  const { data: updated, error: updateError } = await context.supabase
    .from("organizations")
    .update(updates)
    .eq("id", context.orgId)
    .select("id, name, slug, logo_url, settings, created_at, updated_at")
    .single();

  if (updateError || !updated) {
    return NextResponse.json(
      {
        error: {
          message: `Failed to update settings: ${updateError?.message}`,
        },
      },
      { status: 500 }
    );
  }

  const previousSettings = parseOrgSettings(
    (orgContext.organization.settings ?? {}) as Record<string, unknown>
  );
  const nextSettings =
    typeof updated.settings === "object" && updated.settings !== null
      ? parseOrgSettings(updated.settings as Record<string, unknown>)
      : previousSettings;

  await appendActivityEvent({
    eventType: "system.settings_updated",
    category: "system",
    severity: "info",
    notificationPolicy: "none",
    payload: {
      updated_fields: Object.keys(updates),
      previous_name: orgContext.organization.name,
      new_name: updated.name,
      updated_settings_keys:
        typeof updates.settings === "object" && updates.settings
          ? Object.keys(updates.settings as Record<string, unknown>)
          : [],
      previous_export_routing: previousSettings.export_routing,
      new_export_routing: nextSettings.export_routing,
    },
  });

  return NextResponse.json({
    organization: normalizeOrganizationSettings(
      updated as unknown as Record<string, unknown>
    ),
    locations: orgContext.locations,
  });
}
