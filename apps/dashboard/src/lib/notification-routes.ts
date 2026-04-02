import type { UserNotification } from "@/types/notifications";

/** Map notification metadata to a frontend route. Returns null if not navigable. */
export function getNotificationHref(n: UserNotification): string | null {
  if (n.resource_type && n.resource_id) {
    return resolveResourceRoute(n.resource_type, n.resource_id);
  }
  return resolveCategoryRoute(n.category);
}

/** Map resource_type + resource_id to a frontend route. */
export function resolveResourceRoute(
  resourceType: string,
  resourceId: string,
): string | null {
  switch (resourceType) {
    case "invoice":
      return `/invoices/${resourceId}`;
    default:
      return null;
  }
}

/** Map category to a frontend route (for non-resource notifications). */
export function resolveCategoryRoute(category: string): string | null {
  switch (category) {
    case "member":
      return "/settings/members";
    case "email":
    case "system":
      return "/settings";
    default:
      return null;
  }
}
