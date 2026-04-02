/**
 * Invoice processing worker — Hono application entry point.
 *
 * Translated from backend/worker-invoice-processor/src/main.py
 *
 * Endpoints:
 *   POST /process — Pub/Sub push endpoint (one invoice per request)
 *   GET  /health  — health check for Cloud Run
 */

import { Hono } from "hono";
import { getConfig } from "./config.js";
import { buildPipeline } from "./build-pipeline.js";

// Mirrored from domain/exceptions.py — will move to @invoiceprocessor/shared

export class RetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RetryableError";
  }
}

export class PermanentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermanentError";
  }
}


const config = getConfig();
const { pipeline } = buildPipeline(config);

const app = new Hono();


app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

app.post("/process", async (c) => {
  /**
   * Handle Pub/Sub push messages.
   *
   * Pub/Sub delivers messages as HTTP POST with a JSON envelope:
   * {
   *   "message": {
   *     "data": "<base64-encoded JSON>",
   *     "messageId": "...",
   *     "publishTime": "..."
   *   },
   *   "subscription": "..."
   * }
   *
   * Returns 200 for permanent failures (acks the message).
   * Returns 500 for transient failures (Pub/Sub retries).
   */
  try {
    const body = await c.req.json();
    const message = body.message;
    const messageData: string | undefined = message?.data;

    if (!messageData) {
      console.error("No message data in Pub/Sub envelope");
      return c.text("No message data", 200);
    }

    const decoded = Buffer.from(messageData, "base64").toString("utf-8");
    const payload = JSON.parse(decoded) as Record<string, unknown>;

    const invoiceId = payload.invoice_id as string | undefined;
    const orgId = payload.org_id as string | undefined;
    const attempt = (payload.attempt as number) ?? 1;

    if (!invoiceId || !orgId) {
      console.error("Missing invoice_id or org_id in message:", payload);
      return c.text("Invalid message", 200);
    }

    console.info(
      `Processing invoice ${invoiceId} (org=${orgId}, attempt=${attempt})`,
    );

    await pipeline.process(invoiceId, orgId, attempt);

    return c.text("OK", 200);
  } catch (err) {
    if (err instanceof RetryableError) {
      // Return 500 so Pub/Sub retries
      console.error("Retryable error:", err.message);
      return c.text(err.message, 500);
    }

    if (err instanceof PermanentError) {
      // Return 200 to ack and prevent infinite retry
      console.error("Permanent error:", err.message);
      return c.text(err.message, 200);
    }

    // Unexpected error — ack to prevent infinite retry
    console.error("Unexpected error in /process:", err);
    return c.text("Internal error", 200);
  }
});


const port = Number(process.env.PORT) || 8080;

Bun.serve({
  fetch: app.fetch,
  port,
  hostname: "0.0.0.0",
});

console.info(`Invoice processing worker running on port ${port}`);
