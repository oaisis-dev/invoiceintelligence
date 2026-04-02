import { NextRequest, NextResponse } from "next/server";
import { fetchFromBackendApi, proxyToBackendApi } from "@/lib/backend-api";
import type { PlatformSetting } from "@/types/database";

const SETTING_KEY = "contact_notification_email";

export async function GET() {
  try {
    const settings = await fetchFromBackendApi<PlatformSetting[]>(
      "/api/admin/settings"
    );
    const setting = settings.find((s) => s.key === SETTING_KEY);
    return NextResponse.json(setting ?? { key: SETTING_KEY, value: "" });
  } catch (err) {
    if (err instanceof Error && err.message.includes("UNAUTHORIZED")) {
      return NextResponse.json({ error: { message: "Not authenticated" } }, { status: 401 });
    }
    return NextResponse.json({ error: { message: "Failed to fetch setting" } }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  return proxyToBackendApi(`/api/admin/settings/${SETTING_KEY}`, {
    method: "PUT",
    body: { value: body.value },
  });
}
