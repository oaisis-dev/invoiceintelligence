import "server-only";

import {
  EMPTY_INBOX_MESSAGE,
  exchangeOAuthAuthorizationCode,
  fetchJson,
  getEmailProviderRedirectUri,
  refreshOAuthAccessToken,
} from "../shared";
import type {
  EmailProviderDefinition,
  MailboxIdentity,
  MailboxVerificationResult,
  ProviderConfig,
} from "../types";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const GOOGLE_GMAIL_PROFILE_URL =
  "https://gmail.googleapis.com/gmail/v1/users/me/profile";
const GOOGLE_GMAIL_MESSAGES_URL =
  "https://gmail.googleapis.com/gmail/v1/users/me/messages";

function getGoogleProviderConfig(): ProviderConfig {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET must be configured"
    );
  }

  return {
    provider: "google",
    label: "Google",
    clientId,
    clientSecret,
    redirectUri: getEmailProviderRedirectUri(),
    authorizationUrl: GOOGLE_AUTH_URL,
    tokenUrl: GOOGLE_TOKEN_URL,
    scopes: [
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    authorizationParams: {
      access_type: "offline",
      prompt: "consent",
    },
  };
}

async function fetchGoogleMailboxIdentity(accessToken: string) {
  const userInfo = await fetchJson<{ email?: string; id?: string }>(
    GOOGLE_USERINFO_URL,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      providerLabel: "Google",
      operation: "mailbox profile lookup",
    }
  );

  if (!userInfo.email) {
    throw new Error("Google mailbox profile did not return an email address");
  }

  return {
    emailAddress: userInfo.email,
    providerAccountId: typeof userInfo.id === "string" ? userInfo.id : null,
    metadata: {},
  } satisfies MailboxIdentity;
}

async function verifyGoogleMailboxAccess(accessToken: string) {
  const verifiedAt = new Date().toISOString();

  await fetchJson(GOOGLE_GMAIL_PROFILE_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
    providerLabel: "Google",
    operation: "mailbox profile verification",
  });

  const messageList = await fetchJson<{
    messages?: Array<{ id: string }>;
  }>(`${GOOGLE_GMAIL_MESSAGES_URL}?maxResults=1&fields=messages/id`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    providerLabel: "Google",
    operation: "mailbox read verification",
  });

  const firstMessageId = messageList.messages?.[0]?.id ?? null;
  if (!firstMessageId) {
    return {
      status: "failed",
      message: EMPTY_INBOX_MESSAGE,
      verifiedAt,
    } satisfies MailboxVerificationResult;
  }

  const message = await fetchJson<{ labelIds?: string[] }>(
    `${GOOGLE_GMAIL_MESSAGES_URL}/${firstMessageId}?format=minimal`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      providerLabel: "Google",
      operation: "mailbox modify verification preload",
    }
  );

  const existingLabel = message.labelIds?.[0] ?? null;
  if (!existingLabel) {
    return {
      status: "failed",
      message: EMPTY_INBOX_MESSAGE,
      verifiedAt,
    } satisfies MailboxVerificationResult;
  }

  await fetchJson(`${GOOGLE_GMAIL_MESSAGES_URL}/${firstMessageId}/modify`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      addLabelIds: [existingLabel],
      removeLabelIds: [],
    }),
    providerLabel: "Google",
    operation: "mailbox modify verification",
  });

  return {
    status: "verified",
    message: "Mailbox access verified successfully.",
    verifiedAt,
  } satisfies MailboxVerificationResult;
}

export const googleEmailProvider: EmailProviderDefinition = {
  provider: "google",
  label: "Google",
  getConfig: getGoogleProviderConfig,
  exchangeAuthorizationCode: async (code) =>
    exchangeOAuthAuthorizationCode(getGoogleProviderConfig(), code),
  refreshAccessToken: async (refreshToken) =>
    refreshOAuthAccessToken(getGoogleProviderConfig(), refreshToken),
  fetchMailboxIdentity: fetchGoogleMailboxIdentity,
  verifyMailboxAccess: verifyGoogleMailboxAccess,
};
