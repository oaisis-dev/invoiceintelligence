import { NextRequest } from "next/server";
import { proxyToBackendApi } from "@/lib/backend-api";

export async function GET() {
  return proxyToBackendApi("/api/system/rules");
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  return proxyToBackendApi("/api/system/rules", { method: "POST", body });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, ...rest } = body;
  return proxyToBackendApi(`/api/system/rules/${id}`, { method: "PUT", body: rest });
}
