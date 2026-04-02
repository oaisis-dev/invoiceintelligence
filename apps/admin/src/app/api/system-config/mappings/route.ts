import { NextRequest } from "next/server";
import { proxyToBackendApi } from "@/lib/backend-api";

export async function GET() {
  return proxyToBackendApi("/api/system/mappings");
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  return proxyToBackendApi("/api/system/mappings", { method: "POST", body });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, ...rest } = body;
  return proxyToBackendApi(`/api/system/mappings/${id}`, { method: "PUT", body: rest });
}
