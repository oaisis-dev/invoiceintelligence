import { NextRequest } from "next/server";
import { proxyToBackendApi } from "@/lib/backend-api";

type Params = { params: Promise<{ recId: string }> };

export async function GET(_request: NextRequest, props: Params) {
  const { recId } = await props.params;
  return proxyToBackendApi(`/api/org/recommendations/terms/${recId}`);
}

export async function POST(request: NextRequest, props: Params) {
  const { recId } = await props.params;
  const body = await request.json();
  return proxyToBackendApi(`/api/org/recommendations/terms/${recId}/resolve`, {
    method: "POST",
    body,
  });
}
