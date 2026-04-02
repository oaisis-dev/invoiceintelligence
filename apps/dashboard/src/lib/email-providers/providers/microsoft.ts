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

const MICROSOFT_GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0";
const MICROSOFT_GRAPH_ME_URL =
  `${MICROSOFT_GRAPH_BASE_URL}/me?$select=id,displayName,mail,userPrincipalName`;
const MICROSOFT_GRAPH_MESSAGES_URL =
  `${MICROSOFT_GRAPH_BASE_URL}/me/mailFolders/inbox/messages`;

function getMicrosoftTenantId() {
  return process.env.MICROSOFT_OAUTH_TENANT_ID || "common";
}

function getMicrosoftProviderConfig(): ProviderConfig {
  const clientId = process.env.MICROSOFT_OAUTH_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "MICROSOFT_OAUTH_CLIENT_ID and MICROSOFT_OAUTH_CLIENT_SECRET must be configured"
    );
  }

  const tenantId = getMicrosoftTenantId();

  return {
    provider: "microsoft",
    label: "Microsoft",
    clientId,
    clientSecret,
    redirectUri: getEmailProviderRedirectUri(),
    authorizationUrl: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`,
    tokenUrl: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    scopes: [
      "offline_access",
      "openid",
      "profile",
      "email",
      "https://graph.microsoft.com/User.Read",
      "https://graph.microsoft.com/Mail.ReadWrite",
    ],
  };
}

async function fetchMicrosoftMailboxIdentity(accessToken: string) {
  const graphProfile = await fetchJson<{
    id?: string;
    displayName?: string;
    mail?: string | null;
    userPrincipalName?: string;
  }>(MICROSOFT_GRAPH_ME_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
    providerLabel: "Microsoft",
    operation: "mailbox profile lookup",
  });

  const emailAddress = graphProfile.mail || graphProfile.userPrincipalName;
  if (!emailAddress) {
    throw new Error("Microsoft mailbox profile did not return an email address");
  }

  return {
    emailAddress,
    providerAccountId: typeof graphProfile.id === "string" ? graphProfile.id : null,
    metadata: {
      display_name:
        typeof graphProfile.displayName === "string" ? graphProfile.displayName : null,
      user_principal_name:
        typeof graphProfile.userPrincipalName === "string"
          ? graphProfile.userPrincipalName
          : null,
    },
  } satisfies MailboxIdentity;
}

async function verifyMicrosoftMailboxAccess(accessToken: string) {
  const verifiedAt = new Date().toISOString();
  const messageList = await fetchJson<{
    value?: Array<{ id?: string; isRead?: boolean | null }>;
  }>(`${MICROSOFT_GRAPH_MESSAGES_URL}?%24top=1&%24select=id,isRead,subject`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    providerLabel: "Microsoft",
    operation: "mailbox read verification",
  });

  const firstMessage = messageList.value?.[0];
  if (!firstMessage?.id) {
    return {
      status: "failed",
      message: EMPTY_INBOX_MESSAGE,
      verifiedAt,
    } satisfies MailboxVerificationResult;
  }

  await fetchJson(`${MICROSOFT_GRAPH_BASE_URL}/me/messages/${firstMessage.id}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      isRead: firstMessage.isRead ?? false,
    }),
    providerLabel: "Microsoft",
    operation: "mailbox modify verification",
  });

  return {
    status: "verified",
    message: "Mailbox access verified successfully.",
    verifiedAt,
  } satisfies MailboxVerificationResult;
}

export const microsoftEmailProvider: EmailProviderDefinition = {
  provider: "microsoft",
  label: "Microsoft",
  getConfig: getMicrosoftProviderConfig,
  exchangeAuthorizationCode: async (code) =>
    exchangeOAuthAuthorizationCode(getMicrosoftProviderConfig(), code),
  refreshAccessToken: async (refreshToken) =>
    refreshOAuthAccessToken(getMicrosoftProviderConfig(), refreshToken),
  fetchMailboxIdentity: fetchMicrosoftMailboxIdentity,
  verifyMailboxAccess: verifyMicrosoftMailboxAccess,
};
