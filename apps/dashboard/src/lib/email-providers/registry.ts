import "server-only";

import { isEmailAccountProvider } from "@/lib/email-provider-catalog";

import { googleEmailProvider } from "./providers/google";
import { microsoftEmailProvider } from "./providers/microsoft";
import type { EmailProvider, EmailProviderDefinition } from "./types";

const EMAIL_PROVIDER_REGISTRY: Record<EmailProvider, EmailProviderDefinition> = {
  google: googleEmailProvider,
  microsoft: microsoftEmailProvider,
};

function getProviderDefinition(provider: EmailProvider) {
  return EMAIL_PROVIDER_REGISTRY[provider];
}

export function resolveEmailProvider(
  value: string | null | undefined
): EmailProvider | null {
  return isEmailAccountProvider(value) ? value : null;
}

export function getEmailProviderConfig(provider: EmailProvider) {
  return getProviderDefinition(provider).getConfig();
}

export function buildProviderAuthorizationUrl(
  provider: EmailProvider,
  state: string
) {
  const config = getEmailProviderConfig(provider);
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: config.scopes.join(" "),
    state,
  });

  for (const [key, value] of Object.entries(config.authorizationParams ?? {})) {
    params.set(key, value);
  }

  return `${config.authorizationUrl}?${params.toString()}`;
}

export async function exchangeAuthorizationCode(
  provider: EmailProvider,
  code: string
) {
  return getProviderDefinition(provider).exchangeAuthorizationCode(code);
}

export async function refreshAccessToken(
  provider: EmailProvider,
  refreshToken: string
) {
  return getProviderDefinition(provider).refreshAccessToken(refreshToken);
}

export async function fetchMailboxIdentity(
  provider: EmailProvider,
  accessToken: string
) {
  return getProviderDefinition(provider).fetchMailboxIdentity(accessToken);
}

export async function verifyMailboxAccess(
  provider: EmailProvider,
  accessToken: string
) {
  return getProviderDefinition(provider).verifyMailboxAccess(accessToken);
}
