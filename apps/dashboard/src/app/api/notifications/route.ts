import { NextRequest } from "next/server";
import { proxyToBackendApi } from "@/lib/backend-api";

export async function GET(request: NextRequest) {
  return proxyToBackendApi("/api/org/notifications", {
    searchParams: request.nextUrl.searchParams,
  });
}
