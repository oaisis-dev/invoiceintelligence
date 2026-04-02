import { NextRequest } from "next/server";
import { proxyToBackendApi } from "@/lib/backend-api";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  return proxyToBackendApi(`/api/invoices/${id}/save-review`, {
    method: "POST",
    body,
  });
}
