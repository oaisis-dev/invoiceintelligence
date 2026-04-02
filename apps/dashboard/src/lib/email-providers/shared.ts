import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import type {
  OAuthStatePayload,
  OAuthTokenResult,
  ProviderConfig,
} from "./types";

export const EMPTY_INBOX_MESSAGE =
  "Inbox is empty. Send a test email to this inbox and run Test connection again.";

const EMAIL_OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;

function getAppUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;
  if (!appUrl) {
    throw new Error("NEXT_PUBLIC_APP_URL is not configured");
  }
  return appUrl.replace(/\/$/, "");
}

function getEmailOAuthStateKey() {
  const keyHex =
    process.env.EMAIL_OAUTH_STATE_SIGNING_KEY ||
    process.env.EMAIL_TOKEN_ENCRYPTION_KEY;

  if (!keyHex) {
    throw new Error(
      "EMAIL_OAUTH_STATE_SIGNING_KEY or EMAIL_TOKEN_ENCRYPTION_KEY is required"
    );
  }

  const key = Buffer.from(keyHex, "hex");
  if (key.length !== 32) {
    throw new Error("OAuth state signing key must be 32 bytes (64 hex chars)");
  }

  return key;
}

function signState(encodedPayload: string) {
  return createHmac("sha256", getEmailOAuthStateKey())
    .update(encodedPayload)
    .digest("base64url");
}

export async function fetchJson<T>(
  input: string,
  init: RequestInit & { providerLabel: string; operation: string }
) {
  const response = await fetch(input, init);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `${init.providerLabel} ${init.operation} failed (${response.status}): ${body || "empty response"}`
    );
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export function getEmailProviderRedirectUri() {
  return `${getAppUrl()}/api/settings/email-accounts/callback`;
}

export function createEmailOAuthState(
  input: Omit<OAuthStatePayload, "issued_at" | "expires_at" | "nonce">
) {
  const now = Date.now();
  const payload: OAuthStatePayload = {
    ...input,
    issued_at: new Date(now).toISOString(),
    expires_at: new Date(now + EMAIL_OAUTH_STATE_TTL_MS).toISOString(),
    nonce: randomBytes(12).toString("base64url"),
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedPayload}.${signState(encodedPayload)}`;
}

export function parseEmailOAuthState(stateParam: string | null) {
  if (!stateParam) {
    return null;
  }

  const [encodedPayload, signature] = stateParam.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signState(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf-8")
    ) as OAuthStatePayload;

    if (new Date(payload.expires_at).getTime() <= Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function exchangeOAuthAuthorizationCode(
  config: ProviderConfig,
  code: string
) {
  const tokenResponse = await fetchJson<Record<string, unknown>>(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    }),
    providerLabel: config.label,
    operation: "token exchange",
  });

  return parseOAuthTokenResult(config, tokenResponse);
}

export async function refreshOAuthAccessToken(
  config: ProviderConfig,
  refreshToken: string
) {
  const tokenResponse = await fetchJson<Record<string, unknown>>(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
    }),
    providerLabel: config.label,
    operation: "token refresh",
  });

  return parseOAuthTokenResult(config, tokenResponse, refreshToken);
}

function parseOAuthTokenResult(
  config: ProviderConfig,
  tokenResponse: Record<string, unknown>,
  fallbackRefreshToken = ""
) {
  const accessToken = tokenResponse.access_token;
  if (typeof accessToken !== "string") {
    throw new Error(`${config.label} token exchange did not return an access token`);
  }

  return {
    accessToken,
    refreshToken:
      typeof tokenResponse.refresh_token === "string"
        ? tokenResponse.refresh_token
        : fallbackRefreshToken,
    expiresIn:
      typeof tokenResponse.expires_in === "number" ? tokenResponse.expires_in : 3600,
    tokenType:
      typeof tokenResponse.token_type === "string" ? tokenResponse.token_type : null,
    scope: typeof tokenResponse.scope === "string" ? tokenResponse.scope : null,
    idToken:
      typeof tokenResponse.id_token === "string" ? tokenResponse.id_token : null,
  } satisfies OAuthTokenResult;
}

export function shouldRefreshAccessToken(tokenExpiresAt: string | null) {
  if (!tokenExpiresAt) {
    return true;
  }

  const expiresAt = Date.parse(tokenExpiresAt);
  if (Number.isNaN(expiresAt)) {
    return true;
  }

  return expiresAt - TOKEN_EXPIRY_BUFFER_MS <= Date.now();
}
