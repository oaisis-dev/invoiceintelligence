import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import {
  getMaintenanceStatus,
  enableMaintenanceMode,
  disableMaintenanceMode,
} from "@/lib/cloud-run";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const status = await getMaintenanceStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error("Failed to get maintenance status:", error);
    return NextResponse.json(
      { error: "Failed to get maintenance status" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!session.permissions.includes("manage_platform")) {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 }
    );
  }

  try {
    const body = (await request.json()) as { enabled: unknown };

    if (typeof body.enabled !== "boolean") {
      return NextResponse.json(
        { error: "Request body must include { enabled: boolean }" },
        { status: 400 }
      );
    }

    if (body.enabled) {
      await enableMaintenanceMode();
    } else {
      await disableMaintenanceMode();
    }

    // Return the expected state directly — the Cloud Run API takes a moment
    // to propagate traffic changes, so re-reading immediately returns stale data.
    return NextResponse.json({
      enabled: body.enabled,
      maintenancePercent: body.enabled ? 100 : 0,
    });
  } catch (error) {
    console.error("Failed to toggle maintenance mode:", error);
    return NextResponse.json(
      { error: "Failed to toggle maintenance mode" },
      { status: 500 }
    );
  }
}
