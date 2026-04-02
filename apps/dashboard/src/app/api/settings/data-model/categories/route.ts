import { NextRequest } from "next/server";
import { proxyToBackendApi } from "@/lib/backend-api";

export async function GET() {
  return proxyToBackendApi("/api/org/categories");
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  return proxyToBackendApi("/api/org/categories", { method: "POST", body });
}
