import type { EmailAccountProvider } from "@/types/database";

export type EmailProviderCatalogEntry = {
  provider: EmailAccountProvider;
  label: string;
  connectLabel: string;
  badgeClassName: string;
};

export const EMAIL_PROVIDER_OPTIONS = [
  {
    provider: "google",
    label: "Gmail",
    connectLabel: "Connect Gmail",
    badgeClassName: "bg-red-100 text-red-700",
  },
  {
    provider: "microsoft",
    label: "Outlook",
    connectLabel: "Connect Outlook",
    badgeClassName: "bg-blue-100 text-blue-700",
  },
] as const satisfies readonly EmailProviderCatalogEntry[];

export const EMAIL_PROVIDER_META: Record<
  EmailAccountProvider,
  Omit<EmailProviderCatalogEntry, "provider">
> = EMAIL_PROVIDER_OPTIONS.reduce(
  (meta, provider) => {
    meta[provider.provider] = {
      label: provider.label,
      connectLabel: provider.connectLabel,
      badgeClassName: provider.badgeClassName,
    };
    return meta;
  },
  {} as Record<EmailAccountProvider, Omit<EmailProviderCatalogEntry, "provider">>
);

export function isEmailAccountProvider(
  value: string | null | undefined
): value is EmailAccountProvider {
  return value === "google" || value === "microsoft";
}
