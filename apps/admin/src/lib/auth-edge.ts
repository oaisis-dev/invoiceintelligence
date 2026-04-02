/**
 * Edge-compatible auth utilities.
 * This module can be imported from middleware (Edge runtime).
 * For server-only utilities (cookies), use @/lib/auth instead.
 */
import { SignJWT, jwtVerify } from "jose";

export const AUTH_COOKIE_NAME = "admin_session";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "dev-secret-change-in-production"
);

export type SessionPayload = {
  email: string;
  permissions: string[];
};

export async function createSessionToken(
  email: string,
  permissions: string[]
): Promise<string> {
  return new SignJWT({ email, permissions })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(SECRET);
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return {
      email: payload.email as string,
      permissions: payload.permissions as string[],
    };
  } catch {
    return null;
  }
}
