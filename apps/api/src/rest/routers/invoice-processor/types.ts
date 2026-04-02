/**
 * Type declarations for InvoiceProcessor route context.
 *
 * These mirror the auth context shapes from the Python backend.
 * The middleware that populates these is expected to come from
 * @invoiceprocessor/shared once that package is wired.
 */

import type { ServiceContainer } from "./container";

export interface OrgAuthContext {
  orgId: string;
  userId: string;
}

export interface AdminAuthContext {
  adminId: string;
  email: string;
  displayName: string | null;
  permissions: string[];
}

/** Hono context variables set by middleware. */
export type InvoiceProcessorEnv = {
  Variables: {
    auth: OrgAuthContext;
    adminAuth: AdminAuthContext;
    container: ServiceContainer;
  };
};

export interface ActivityEventInput {
  orgId: string | null;
  actorUserId: string | null;
  eventType: string;
  category: string;
  severity: string;
  notificationPolicy: string;
  resourceType?: string | null;
  resourceId?: string | null;
  payload: Record<string, unknown>;
  dedupeKey?: string | null;
}
