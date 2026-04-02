import { NextRequest } from "next/server";
import { proxyToBackendApi } from "@/lib/backend-api";

export async function GET(request: NextRequest) {
  const searchParams = new URL(request.url).searchParams;
  return proxyToBackendApi("/api/org/normalization-settings", { searchParams });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  return proxyToBackendApi("/api/org/normalization-settings", {
    method: "POST",
    body,
  });
}
