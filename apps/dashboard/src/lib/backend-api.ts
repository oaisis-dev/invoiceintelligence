/**
 * Proxy helper for forwarding BFF requests to the backend-api service.
 *
 * All data-model routes delegate to backend-api, passing the Clerk JWT
 * for authentication. Business logic lives in shared Python services.
 *
 * The Clerk session JWT does not include org_id, so the proxy resolves
 * the user's org context from Supabase and passes it via X-Org-Id and
 * X-User-Role headers. The backend-api reads these when the JWT lacks
 * org_id (see backend-api/src/auth.py require_org_auth).
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { requireAuthContext } from "@/lib/authz";

const BACKEND_API_URL =
  process.env.BACKEND_API_URL ?? "http://localhost:8001";

/**
 * Forward a request to backend-api with the Clerk session token.
 * Returns a NextResponse that can be returned directly from a route handler.
 */
export async function proxyToBackendApi(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    searchParams?: URLSearchParams;
  } = {}
): Promise<NextResponse> {
  const authResult = await requireAuthContext();
  if (authResult.error) return authResult.error;
  const { context } = authResult;

  const { getToken } = await auth();
  const token = await getToken();

  if (!token) {
    return NextResponse.json(
      { error: { message: "Not authenticated" } },
      { status: 401 }
    );
  }

  let url = `${BACKEND_API_URL}${path}`;
  if (options.searchParams?.toString()) {
    url += `?${options.searchParams.toString()}`;
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "X-Org-Id": context.orgId,
    "X-User-Id": context.appUserId,
    "X-User-Role": context.role,
  };

  const fetchOptions: RequestInit = {
    method: options.method ?? "GET",
    headers,
  };

  if (options.body !== undefined) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  try {
    const res = await fetch(url, fetchOptions);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error(`Backend API proxy error [${path}]:`, error);
    return NextResponse.json(
      { error: { message: "Backend API unavailable" } },
      { status: 502 }
    );
  }
}
