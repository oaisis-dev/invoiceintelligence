import { NextRequest } from "next/server";
import { proxyToBackendApi } from "@/lib/backend-api";

export async function GET() {
  return proxyToBackendApi("/api/admin/contact-requests");
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, ...rest } = body;
  return proxyToBackendApi(`/api/admin/contact-requests/${id}`, {
    method: "PUT",
    body: rest,
  });
}
