import { NextRequest } from "next/server";
import { proxyToBackendApi } from "@/lib/backend-api";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ recId: string }> }
) {
  const { recId } = await params;
  const body = await request.json();
  return proxyToBackendApi(`/api/system/recommendations/terms/${recId}/promote`, {
    method: "POST",
    body,
  });
}
