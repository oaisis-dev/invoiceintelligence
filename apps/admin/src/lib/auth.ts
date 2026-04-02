import "server-only";

import { cookies } from "next/headers";

// Re-export Edge-compatible utilities so server code can import from one place
export {
  AUTH_COOKIE_NAME,
  createSessionToken,
  verifySessionToken,
  type SessionPayload,
} from "@/lib/auth-edge";

import { AUTH_COOKIE_NAME } from "@/lib/auth-edge";
import { verifySessionToken } from "@/lib/auth-edge";
import type { SessionPayload } from "@/lib/auth-edge";

export async function getSessionFromCookies(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
