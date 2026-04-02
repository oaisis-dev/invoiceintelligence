/**
 * Public contact form — POST /api/public/contact (no auth required)
 * Translated from backend/api/src/routes/public/contact.py
 */

import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { InvoiceProcessorEnv } from "../../types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const app = new Hono<InvoiceProcessorEnv>();

// POST /api/public/contact — accept a public contact form submission
app.post("/contact", async (c) => {
  const container = c.get("container");
  const body = await c.req.json<{
    name: string;
    business_name: string;
    email: string;
    message?: string;
    demo_requested?: boolean;
  }>();

  // Validate / sanitize
  const name = (body.name ?? "").trim().slice(0, 200);
  const businessName = (body.business_name ?? "").trim().slice(0, 200);
  const email = (body.email ?? "").trim().toLowerCase();
  const message = body.message ? body.message.trim().slice(0, 5000) : null;
  const demoRequested = body.demo_requested ?? false;

  if (!name || !businessName) {
    throw new HTTPException(400, { message: "Name and business name are required." });
  }

  if (!EMAIL_RE.test(email)) {
    throw new HTTPException(400, { message: "Please enter a valid email address." });
  }

  // Persist to database
  const contactRepo = container.admin.contactRequest;
  const record = contactRepo.create({
    name,
    email,
    message,
    businessName,
    demoRequested,
  });

  // Send notification email (best-effort)
  try {
    const settingsRepo = container.admin.platformSettings;
    const setting = settingsRepo.getByKey("contact_notification_email");
    let recipientEmail: string | null = null;
    if (setting?.value) {
      const val = setting.value;
      recipientEmail = typeof val === "string" ? val.replace(/^"|"$/g, "") : String(val);
    }

    if (recipientEmail) {
      const subject = demoRequested
        ? `Demo Request from ${name} at ${businessName}`
        : `Contact from ${name} at ${businessName}`;
      const htmlContent = buildContactEmailHtml(name, businessName, email, message, demoRequested);
      await container.emailSender.send({
        toEmail: recipientEmail,
        toName: null,
        subject,
        htmlContent,
        replyTo: email,
      });
    }
  } catch (err) {
    console.error("Failed to send contact notification email", err);
  }

  return c.json({ ok: true, id: record?.id ?? null });
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildContactEmailHtml(
  name: string,
  businessName: string,
  email: string,
  message: string | null,
  demoRequested: boolean,
): string {
  const safeName = escapeHtml(name);
  const safeBiz = escapeHtml(businessName);
  const safeEmail = escapeHtml(email);
  const safeMsg = message ? escapeHtml(message) : "<em>No message provided</em>";
  const demoLabel = demoRequested ? "Yes" : "No";
  const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";

  return `\
<html>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0"
       style="background:#ffffff;border-radius:8px;padding:32px;border:1px solid #e4e4e7;">
<tr><td>
  <h2 style="margin:0 0 16px;color:#18181b;">New Contact Form Submission</h2>
  <table width="100%" cellpadding="6" cellspacing="0" style="color:#18181b;font-size:14px;">
    <tr><td style="font-weight:bold;width:140px;">Name</td><td>${safeName}</td></tr>
    <tr><td style="font-weight:bold;">Business</td><td>${safeBiz}</td></tr>
    <tr><td style="font-weight:bold;">Email</td>
        <td><a href="mailto:${safeEmail}" style="color:#2563eb;">${safeEmail}</a></td></tr>
    <tr><td style="font-weight:bold;">Demo Requested</td><td>${demoLabel}</td></tr>
    <tr><td style="font-weight:bold;">Message</td><td>${safeMsg}</td></tr>
  </table>
  <hr style="margin:24px 0;border:none;border-top:1px solid #e4e4e7;" />
  <p style="margin:0;font-size:12px;color:#71717a;">
    Submitted at ${timestamp} &middot; Invoice Intelligence
  </p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export { app as publicContactRouter };
