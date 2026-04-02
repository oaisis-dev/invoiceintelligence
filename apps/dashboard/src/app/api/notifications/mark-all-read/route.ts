import { proxyToBackendApi } from "@/lib/backend-api";

export async function POST() {
  return proxyToBackendApi("/api/org/notifications/mark-all-read", {
    method: "POST",
  });
}
