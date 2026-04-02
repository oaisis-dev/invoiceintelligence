"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ChevronRight,
  FileText,
  ExternalLink,
  AlertCircle,
  Mail,
  Paperclip,
} from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { EmailStatusBadge } from "@/components/email-status-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { TechnicalDetails } from "@/components/ui/technical-details";
import { translateError } from "@/lib/translate-error";
import { formatDateTime, formatRelativeTime } from "@/lib/format";
import type {
  EmailIngestionWithAttachments,
  EmailAttachmentWithInvoice,
  EmailAttachmentStatus,
} from "@/types/database";

interface EmailIngestionRowProps {
  email: EmailIngestionWithAttachments;
}

const attachmentStatusConfig: Record<
  EmailAttachmentStatus,
  { label: string; variant: "success" | "warning" | "error" }
> = {
  pending: { label: "Pending", variant: "warning" },
  queued: { label: "Queued", variant: "warning" },
  skipped: { label: "Skipped", variant: "warning" },
  failed: { label: "Failed", variant: "error" },
};

/** Invoice statuses that indicate processing has completed successfully. */
const PROCESSED_INVOICE_STATUSES = new Set([
  "ready_for_review",
  "approved",
  "exported",
]);

function AttachmentRow({
  attachment,
  isLast,
}: {
  attachment: EmailAttachmentWithInvoice;
  isLast: boolean;
}) {
  const hasInvoice = attachment.invoice_id !== null && attachment.invoice !== null;

  // Derive effective display status from the linked invoice when the
  // attachment DB status is still "queued" (the pipeline never updates it).
  let statusCfg: { label: string; variant: "success" | "warning" | "error" };
  if (attachment.status === "queued" && hasInvoice) {
    const invoiceStatus = attachment.invoice!.status;
    if (PROCESSED_INVOICE_STATUSES.has(invoiceStatus)) {
      statusCfg = { label: "Processed", variant: "success" };
    } else if (invoiceStatus === "processing") {
      statusCfg = { label: "Processing", variant: "warning" };
    } else if (invoiceStatus === "failed") {
      statusCfg = { label: "Failed", variant: "error" };
    } else {
      statusCfg = attachmentStatusConfig[attachment.status];
    }
  } else {
    statusCfg = attachmentStatusConfig[attachment.status];
  }
  const translatedError = useMemo(
    () =>
      attachment.status === "failed" && attachment.error_message
        ? translateError(attachment.error_message)
        : null,
    [attachment.status, attachment.error_message]
  );

  return (
    <div
      className={`flex items-center gap-3 py-2.5 pl-12 pr-4 ${
        !isLast ? "border-b border-border-input/50" : ""
      }`}
    >
      {/* Tree connector */}
      <span
        className="flex size-4 shrink-0 items-center justify-center text-text-secondary"
        aria-hidden="true"
      >
        {isLast ? "\u2514" : "\u251C"}
      </span>

      {/* File icon */}
      <FileText
        className="size-4 shrink-0 text-text-secondary"
        aria-hidden="true"
      />

      {/* Filename */}
      <span className="min-w-0 flex-1 truncate text-[13px] text-text-primary">
        {attachment.filename}
      </span>

      {/* Invoice link or status */}
      <div className="flex shrink-0 items-center gap-2">
        {hasInvoice ? (
          <Link
            href={`/invoices/${attachment.invoice_id}`}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium text-primary transition-colors hover:bg-primary-05"
          >
            {attachment.invoice?.vendor_name
              ? `${attachment.invoice.vendor_name}`
              : `Invoice`}
            <ExternalLink className="size-3" aria-hidden="true" />
          </Link>
        ) : null}

        <StatusBadge variant={statusCfg.variant}>
          {statusCfg.label}
        </StatusBadge>
      </div>

      {/* Error message for failed attachments */}
      {translatedError && (
        <div className="ml-auto flex items-center gap-1.5 text-[12px] text-error">
          <AlertCircle className="size-3 shrink-0" aria-hidden="true" />
          <span className="truncate">{translatedError.userMessage}</span>
        </div>
      )}
    </div>
  );
}

export function EmailIngestionRow({ email }: EmailIngestionRowProps) {
  const [expanded, setExpanded] = useState(false);
  const hasAttachments = email.email_attachments.length > 0;
  const shouldReduceMotion = useReducedMotion();
  const translatedEmailError = useMemo(
    () =>
      email.status === "failed" && email.error_message
        ? translateError(email.error_message)
        : null,
    [email.status, email.error_message]
  );

  return (
    <GlassCard className="overflow-hidden transition-shadow hover:shadow-[0px_10px_20px_0px_rgba(0,0,0,0.12),0px_4px_8px_0px_rgba(0,0,0,0.08)]">
      {/* Main row (clickable) */}
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        disabled={!hasAttachments}
        aria-expanded={expanded}
        aria-controls={`email-attachments-${email.id}`}
        className={`flex w-full items-center gap-4 p-5 text-left transition-colors ${
          hasAttachments
            ? "cursor-pointer hover:bg-primary-05/50"
            : "cursor-default"
        }`}
      >
        {/* Mail icon */}
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-10"
          aria-hidden="true"
        >
          <Mail className="size-5 text-primary" />
        </div>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
          {/* Sender + subject */}
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-[14px] font-medium leading-[20px] text-text-primary">
              {email.from_email}
            </span>
            <span className="truncate text-[13px] leading-[18px] text-text-secondary">
              {email.subject}
            </span>
          </div>

          {/* Meta: attachments count, status, time */}
          <div className="flex shrink-0 items-center gap-3">
            {/* Attachment count */}
            <span className="inline-flex items-center gap-1 text-[13px] text-text-secondary">
              <Paperclip className="size-3.5" aria-hidden="true" />
              {email.attachment_count} PDF{email.attachment_count !== 1 ? "s" : ""}
            </span>

            {/* Status badge */}
            <EmailStatusBadge status={email.status} />

            {/* Time */}
            <span
              className="hidden whitespace-nowrap text-[13px] text-text-secondary sm:inline"
              title={formatDateTime(email.received_at ?? email.created_at)}
            >
              {formatRelativeTime(email.received_at ?? email.created_at)}
            </span>
          </div>
        </div>

        {/* Chevron */}
        {hasAttachments && (
          <motion.span
            className="shrink-0 text-text-secondary"
            aria-hidden="true"
            animate={shouldReduceMotion ? undefined : { rotate: expanded ? 90 : 0 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
          >
            <ChevronRight className="size-5" />
          </motion.span>
        )}
      </button>

      {/* Error message for the email itself */}
      {translatedEmailError && !expanded && (
        <div className="border-t border-error/20 bg-error-10/50 px-5 py-2.5 text-[13px] text-error">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
            <span>{translatedEmailError.userMessage}</span>
          </div>
          <p className="mt-0.5 pl-6 text-[12px] text-error/80">{translatedEmailError.action}</p>
          <div className="pl-6">
            <TechnicalDetails detail={translatedEmailError.technicalDetail} />
          </div>
        </div>
      )}

      {/* Expandable attachments panel */}
      <AnimatePresence initial={false}>
        {expanded && hasAttachments ? (
          <motion.div
            id={`email-attachments-${email.id}`}
            key="attachments"
            initial={shouldReduceMotion ? undefined : { opacity: 0, y: -6 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="border-t border-border-input bg-white/40"
          >
            {/* Error message (shown inside expanded area too) */}
            {translatedEmailError && (
              <div className="bg-error-10/50 px-5 py-2.5 text-[13px] text-error">
                <div className="flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
                  <span>{translatedEmailError.userMessage}</span>
                </div>
                <p className="mt-0.5 pl-6 text-[12px] text-error/80">{translatedEmailError.action}</p>
                <div className="pl-6">
                  <TechnicalDetails detail={translatedEmailError.technicalDetail} />
                </div>
              </div>
            )}

            {email.email_attachments.map((attachment, index) => (
              <AttachmentRow
                key={attachment.id}
                attachment={attachment}
                isLast={index === email.email_attachments.length - 1}
              />
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </GlassCard>
  );
}
