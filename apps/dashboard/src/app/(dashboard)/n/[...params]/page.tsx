import { notFound, redirect } from "next/navigation";
import {
  resolveCategoryRoute,
  resolveResourceRoute,
} from "@/lib/notification-routes";

/**
 * Notification redirect page — `/n/{resource_type}/{resource_id}` or `/n/{category}`.
 *
 * Used by email notification CTAs so the backend never encodes frontend routes.
 * The route mapping lives in `lib/notification-routes.ts` (shared with in-app clicks).
 */
export default async function NotificationRedirectPage({
  params,
}: {
  params: Promise<{ params: string[] }>;
}) {
  const { params: segments } = await params;

  let dest: string | null = null;

  if (segments.length >= 2) {
    // /n/{resource_type}/{resource_id}
    dest = resolveResourceRoute(segments[0], segments[1]);
  }

  if (!dest && segments.length >= 1) {
    // /n/{category}
    dest = resolveCategoryRoute(segments[0]);
  }

  if (dest) {
    redirect(dest);
  }

  notFound();
}
