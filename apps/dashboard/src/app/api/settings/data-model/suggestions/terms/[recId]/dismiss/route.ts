import { NextRequest } from "next/server";
import { proxyToBackendApi } from "@/lib/backend-api";

type Params = { params: Promise<{ recId: string }> };

export async function POST(_request: NextRequest, props: Params) {
  const { recId } = await props.params;
  return proxyToBackendApi(`/api/org/recommendations/terms/${recId}/dismiss`, {
    method: "POST",
  });
}
