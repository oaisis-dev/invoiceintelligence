import { NextRequest } from "next/server";
import { proxyToBackendApi } from "@/lib/backend-api";

export async function GET() {
  return proxyToBackendApi("/api/admin/admins");
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  return proxyToBackendApi("/api/admin/admins", { method: "POST", body });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, ...rest } = body;
  return proxyToBackendApi(`/api/admin/admins/${id}`, { method: "PUT", body: rest });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  return proxyToBackendApi(`/api/admin/admins/${id}`, { method: "DELETE" });
}
