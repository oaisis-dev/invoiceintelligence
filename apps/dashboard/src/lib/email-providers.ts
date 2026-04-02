import "server-only";

export {
  buildProviderAuthorizationUrl,
  exchangeAuthorizationCode,
  fetchMailboxIdentity,
  getEmailProviderConfig,
  refreshAccessToken,
  resolveEmailProvider,
  verifyMailboxAccess,
} from "./email-providers/registry";
export {
  createEmailOAuthState,
  parseEmailOAuthState,
  shouldRefreshAccessToken,
} from "./email-providers/shared";
export type {
  EmailProvider,
  MailboxIdentity,
  MailboxVerificationResult,
  OAuthTokenResult,
  ProviderConfig,
} from "./email-providers/types";
