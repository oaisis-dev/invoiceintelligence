import { NextRequest } from "next/server";
import { proxyToBackendApi } from "@/lib/backend-api";

type RouteParams = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, props: RouteParams) {
  const { id } = await props.params;
  const body = await request.json();
  return proxyToBackendApi(`/api/org/normalization-settings/${id}`, {
    method: "PUT",
    body,
  });
}

export async function DELETE(_request: NextRequest, props: RouteParams) {
  const { id } = await props.params;
  return proxyToBackendApi(`/api/org/normalization-settings/${id}`, {
    method: "DELETE",
  });
}
