/**
 * Proxy helper for forwarding admin BFF requests to the backend-api service.
 *
 * Uses the admin session cookie for authentication. The backend-api verifies
 * admin tokens via ADMIN_JWT_SECRET (must match admin app's AUTH_SECRET).
 */

import "server-only";

import { NextResponse } from "next/server";
import { getSessionFromCookies, AUTH_COOKIE_NAME } from "@/lib/auth";
import { cookies } from "next/headers";

const BACKEND_API_URL =
  process.env.BACKEND_API_URL ?? "http://localhost:8001";

/**
 * Forward a request to backend-api with the admin session token.
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
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json(
      { error: { message: "Not authenticated" } },
      { status: 401 }
    );
  }

  // Pass the raw session cookie token to backend-api
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json(
      { error: { message: "No session token" } },
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
  };

  const fetchOptions: RequestInit = {
    method: options.method ?? "GET",
    headers,
    cache: "no-store",
  };

  if (options.body !== undefined) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  try {
    const res = await fetch(url, fetchOptions);
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      return NextResponse.json(data, { status: res.status });
    } catch {
      return NextResponse.json(
        { error: { message: text || "Non-JSON response from backend" } },
        { status: res.status }
      );
    }
  } catch (error) {
    console.error(`Backend API proxy error [${path}]:`, error);
    return NextResponse.json(
      { error: { message: "Backend API unavailable" } },
      { status: 502 }
    );
  }
}

/**
 * Fetch data from backend-api and return parsed JSON.
 * Used by server components and authz (not API routes — those use proxyToBackendApi).
 */
export async function fetchFromBackendApi<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    searchParams?: URLSearchParams;
  } = {}
): Promise<T> {
  const session = await getSessionFromCookies();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    throw new Error("UNAUTHORIZED");
  }

  let url = `${BACKEND_API_URL}${path}`;
  if (options.searchParams?.toString()) {
    url += `?${options.searchParams.toString()}`;
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const fetchOptions: RequestInit = {
    method: options.method ?? "GET",
    headers,
    cache: "no-store",
  };

  if (options.body !== undefined) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  const res = await fetch(url, fetchOptions);

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 401) throw new Error("UNAUTHORIZED");
    if (res.status === 403) throw new Error("ACCESS_DENIED: " + text);
    throw new Error(`Backend API error (${res.status}): ${text}`);
  }

  return res.json() as Promise<T>;
}
