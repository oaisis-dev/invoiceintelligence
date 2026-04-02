import { NextRequest } from "next/server";
import { proxyToBackendApi } from "@/lib/backend-api";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyToBackendApi(`/api/admin/organizations/${id}/subscription`);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  return proxyToBackendApi(`/api/admin/organizations/${id}/subscription`, {
    method: "PUT",
    body,
  });
}
