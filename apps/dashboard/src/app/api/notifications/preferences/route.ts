import { NextRequest, NextResponse } from "next/server";
import { proxyToBackendApi } from "@/lib/backend-api";

export async function GET() {
  return proxyToBackendApi("/api/org/notifications/preferences");
}

export async function PUT(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { message: "Invalid JSON body." } },
      { status: 400 }
    );
  }

  return proxyToBackendApi("/api/org/notifications/preferences", {
    method: "PUT",
    body,
  });
}
