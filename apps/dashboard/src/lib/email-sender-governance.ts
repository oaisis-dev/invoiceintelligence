import type {
  EmailAllowedSender,
  EmailSenderRecommendation,
} from "@/types/database";

export const EMAIL_DISCOVERY_KEYWORDS = [
  "invoice",
  "tax invoice",
  "bill",
  "receipt",
  "statement",
  "payment due",
  "remittance",
  "purchase order",
] as const;

export function normalizeEmailAddress(value: string) {
  return value.trim().toLowerCase();
}

export function getEffectiveAllowedSenderScope({
  orgAllowedSenders,
  locationAllowedSenders,
}: {
  orgAllowedSenders: EmailAllowedSender[];
  locationAllowedSenders: EmailAllowedSender[];
}) {
  if (locationAllowedSenders.length > 0) {
    return "location" as const;
  }
  if (orgAllowedSenders.length > 0) {
    return "org" as const;
  }
  return "none" as const;
}

export function getPendingSenderRecommendations(
  recommendations: EmailSenderRecommendation[]
) {
  return recommendations.filter((recommendation) => recommendation.status === "pending");
}
