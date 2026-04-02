import { proxyToBackendApi } from "@/lib/backend-api";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ recId: string }> }
) {
  const { recId } = await params;
  return proxyToBackendApi(`/api/system/recommendations/terms/${recId}/dismiss`, {
    method: "POST",
  });
}
