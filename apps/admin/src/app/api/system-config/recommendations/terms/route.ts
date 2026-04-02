import { proxyToBackendApi } from "@/lib/backend-api";

export async function GET() {
  return proxyToBackendApi("/api/system/recommendations/terms");
}
