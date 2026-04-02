/**
 * InvoiceProcessor Hono router — aggregates all route groups.
 *
 * Translated from backend/api/src/main.py.
 * Mounted into the existing Midday API app as a sub-router.
 *
 * Route prefix mapping (Python -> TypeScript):
 *   /api/org/fields            -> /ip/api/org/fields
 *   /api/org/mappings          -> /ip/api/org/mappings
 *   /api/org/categories        -> /ip/api/org/categories (+ category-rules)
 *   /api/org/normalization-settings -> /ip/api/org/normalization-settings
 *   /api/org/recommendations   -> /ip/api/org/recommendations
 *   /api/format-options        -> /ip/api/format-options
 *   /api/invoices              -> /ip/api/invoices
 *   /api/org/*                 -> /ip/api/org/* (notifications, activity-events)
 *   /api/system                -> /ip/api/system
 *   /api/admin                 -> /ip/api/admin
 *   /api/public                -> /ip/api/public
 *   /api/internal              -> /ip/api/internal
 */

import { Hono } from "hono";
import type { InvoiceProcessorEnv } from "./types";

// Org routes
import { canonicalFieldsRouter } from "./routes/canonical-fields";
import { termMappingsRouter } from "./routes/term-mappings";
import { categoriesRouter } from "./routes/categories";
import { normalizationSettingsRouter } from "./routes/normalization-settings";
import { recommendationsRouter } from "./routes/recommendations";
import { formatOptionsRouter } from "./routes/format-options";
import { reviewRouter } from "./routes/review";
import { notificationsRouter } from "./routes/notifications";

// System routes (platform admin)
import { systemConfigRouter } from "./routes/system/config";
import { systemRecommendationsRouter } from "./routes/system/recommendations";

// Admin routes (platform admin panel)
import { adminsRouter } from "./routes/admin/admins";
import { organizationsRouter } from "./routes/admin/organizations";
import { usersRouter } from "./routes/admin/users";
import { subscriptionsRouter } from "./routes/admin/subscriptions";
import { settingsRouter } from "./routes/admin/settings";
import { statsRouter } from "./routes/admin/stats";
import { contactRequestsRouter } from "./routes/admin/contact-requests";
import { adminNotificationsRouter } from "./routes/admin/notifications";
import { meRouter } from "./routes/admin/me";

// Public routes (no auth)
import { publicContactRouter } from "./routes/public/contact";

const invoiceProcessorRouter = new Hono<InvoiceProcessorEnv>();

// Health check
invoiceProcessorRouter.get("/health", (c) => c.json({ status: "ok" }));

// -- Org routes ---------------------------------------------------------------
invoiceProcessorRouter.route("/api/org/fields", canonicalFieldsRouter);
invoiceProcessorRouter.route("/api/org/mappings", termMappingsRouter);
// Categories router uses absolute paths internally for /categories and /category-rules
invoiceProcessorRouter.route("/api/org", categoriesRouter);
invoiceProcessorRouter.route("/api/org/normalization-settings", normalizationSettingsRouter);
invoiceProcessorRouter.route("/api/org/recommendations", recommendationsRouter);
invoiceProcessorRouter.route("/api/format-options", formatOptionsRouter);
invoiceProcessorRouter.route("/api/invoices", reviewRouter);
// Notifications router handles /api/org/notifications, /api/org/activity-events, /api/internal/*
invoiceProcessorRouter.route("/api/org", notificationsRouter);

// -- System routes (platform admin) -------------------------------------------
invoiceProcessorRouter.route("/api/system", systemConfigRouter);
invoiceProcessorRouter.route("/api/system/recommendations", systemRecommendationsRouter);

// -- Admin routes (platform admin panel) --------------------------------------
invoiceProcessorRouter.route("/api/admin/me", meRouter);
invoiceProcessorRouter.route("/api/admin/admins", adminsRouter);
invoiceProcessorRouter.route("/api/admin/organizations", organizationsRouter);
invoiceProcessorRouter.route("/api/admin/users", usersRouter);
invoiceProcessorRouter.route("/api/admin", subscriptionsRouter);
invoiceProcessorRouter.route("/api/admin/settings", settingsRouter);
invoiceProcessorRouter.route("/api/admin/stats", statsRouter);
invoiceProcessorRouter.route("/api/admin/contact-requests", contactRequestsRouter);
invoiceProcessorRouter.route("/api/admin/notifications", adminNotificationsRouter);

// -- Public routes (no auth) --------------------------------------------------
invoiceProcessorRouter.route("/api/public", publicContactRouter);

export { invoiceProcessorRouter };
