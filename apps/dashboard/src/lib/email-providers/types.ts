import type { EmailAccountProvider } from "@/types/database";

export type EmailProvider = EmailAccountProvider;

export type OAuthStatePayload = {
  org_id: string;
  location_id: string | null;
  provider: EmailProvider;
  app_user_id: string;
  clerk_user_id: string;
  issued_at: string;
  expires_at: string;
  nonce: string;
};

export type ProviderConfig = {
  provider: EmailProvider;
  label: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
  authorizationParams?: Record<string, string>;
};

export type OAuthTokenResult = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string | null;
  scope: string | null;
  idToken: string | null;
};

export type MailboxIdentity = {
  emailAddress: string;
  providerAccountId: string | null;
  metadata: Record<string, unknown>;
};

export type MailboxVerificationResult = {
  status: "verified" | "failed";
  message: string;
  verifiedAt: string;
};

export type EmailProviderDefinition = {
  provider: EmailProvider;
  label: string;
  getConfig: () => ProviderConfig;
  exchangeAuthorizationCode: (code: string) => Promise<OAuthTokenResult>;
  refreshAccessToken: (refreshToken: string) => Promise<OAuthTokenResult>;
  fetchMailboxIdentity: (accessToken: string) => Promise<MailboxIdentity>;
  verifyMailboxAccess: (
    accessToken: string
  ) => Promise<MailboxVerificationResult>;
};
