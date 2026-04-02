import { NextRequest, NextResponse } from "next/server";
import { proxyToBackendApi } from "@/lib/backend-api";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { message: "Invalid JSON body." } },
      { status: 400 }
    );
  }

  return proxyToBackendApi("/api/org/notifications/dismiss", {
    method: "POST",
    body,
  });
}
