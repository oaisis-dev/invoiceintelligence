/**
 * Invoice review correction detection — /api/invoices/:id/save-review
 * Translated from backend/api/src/routes/review.py
 *
 * When a reviewer saves edits to an invoice, this route diffs the original
 * normalized values against the corrections and creates org-level recommendations.
 */

import { Hono } from "hono";
import type { InvoiceProcessorEnv } from "../types";
import { clerkAuth } from "../middleware";

const app = new Hono<InvoiceProcessorEnv>();

// POST /api/invoices/:invoiceId/save-review
app.post("/:invoiceId/save-review", clerkAuth, async (c) => {
  const auth = c.get("auth");
  const container = c.get("container");
  const invoiceId = c.req.param("invoiceId");
  const body = await c.req.json<{
    vendor_name?: string | null;
    original: Record<string, unknown>;
    corrected: Record<string, unknown>;
  }>();

  const corrections = container.correctionDetectionService.detectAndSave({
    orgId: auth.orgId,
    invoiceId,
    vendorName: body.vendor_name ?? null,
    original: body.original,
    corrected: body.corrected,
  });

  return c.json({
    corrections_detected: corrections.length,
    corrections: corrections.map((correction: { correctionType: string; details: unknown }) => ({
      type: correction.correctionType,
      details: correction.details,
    })),
  });
});

export { app as reviewRouter };
