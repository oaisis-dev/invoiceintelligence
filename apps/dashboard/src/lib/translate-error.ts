// ---------------------------------------------------------------------------
// Error message translation layer.
//
// Maps raw backend error strings to plain-English user messages.
// Rules are evaluated top-to-bottom; first match wins.
// ---------------------------------------------------------------------------

export interface TranslatedError {
  /** Plain-English explanation of what went wrong */
  userMessage: string;
  /** What the user can do about it */
  action: string;
  /** The original raw error string (for support/debugging) */
  technicalDetail: string;
}

interface ErrorRule {
  pattern: RegExp;
  userMessage: string | ((match: RegExpMatchArray) => string);
  action: string | ((match: RegExpMatchArray) => string);
}

const FIELD_LABELS: Record<string, string> = {
  number: "invoice number",
  date: "date",
  total: "total amount",
  name: "name",
};

function friendlyField(raw: string): string {
  return FIELD_LABELS[raw.trim()] ?? raw.trim();
}

const ERROR_RULES: ErrorRule[] = [
  // --- Processing failures ---
  {
    pattern: /No raw text available/i,
    userMessage:
      "We couldn't read any text from this document. The file may be corrupted or in an unsupported format.",
    action:
      "Try re-uploading the file, or upload a version with selectable text.",
  },
  {
    pattern: /Step '\w+' timed out/i,
    userMessage: "Processing took too long and was stopped.",
    action: "This is usually temporary. Try reprocessing the invoice.",
  },
  {
    pattern: /Invoice .+ not found/i,
    userMessage: "The invoice record could not be found.",
    action: "It may have been deleted. Contact support if this is unexpected.",
  },
  {
    pattern: /date.*time.*out of range/i,
    userMessage:
      "The date on this invoice is in a format we don't recognize yet.",
    action: "You can enter the date manually below.",
  },
  {
    pattern: /Original:.*DB also failed:/i,
    userMessage:
      "Something went wrong processing this invoice and the error couldn't be saved.",
    action: "Try reprocessing. If this keeps happening, contact support.",
  },

  // --- Email / attachment errors ---
  {
    pattern: /Skipped duplicate upload by file hash/i,
    userMessage: "This file was already uploaded previously.",
    action: "Skipped to avoid duplicates. No action needed.",
  },
  {
    pattern: /Sender not in approved list/i,
    userMessage: "This email came from an unrecognized sender.",
    action:
      "Add the sender to your approved email list in Settings, or upload the invoice manually.",
  },
  {
    pattern: /Not a PDF file/i,
    userMessage: "This file is not a PDF.",
    action: "Only PDF files can be processed. No action needed.",
  },

  // --- Validation warnings ---
  {
    pattern: /Missing invoice field:\s*(.+)/i,
    userMessage: (m) =>
      `We couldn't find the ${friendlyField(m[1])} on this invoice.`,
    action: "Please enter it manually.",
  },
  {
    pattern: /Missing vendor field:\s*(.+)/i,
    userMessage: (m) =>
      `The vendor ${friendlyField(m[1])} couldn't be determined from the document.`,
    action: "Please enter it manually.",
  },
  {
    pattern: /No line items extracted/i,
    userMessage: "We couldn't find any line items on this invoice.",
    action: "Please add line items manually, or try reprocessing.",
  },

  // --- OCR / quality ---
  {
    pattern: /OCR confidence below threshold/i,
    userMessage:
      "The document scan quality is too low to read reliably.",
    action:
      "Try re-uploading a clearer scan or a higher-resolution PDF.",
  },

  // --- Upload / queue ---
  {
    pattern: /Failed to queue job/i,
    userMessage: "The invoice couldn't be queued for processing.",
    action: "Try re-uploading the file.",
  },

  // --- Provider / infrastructure errors ---
  {
    pattern: /imap|smtp|(email|mail).*(connect|timeout|auth|fail)/i,
    userMessage: "The email server couldn't be reached.",
    action: "Check your email intake settings.",
  },
  {
    pattern: /google.*vision|ocr.*api|429|quota|rate.limit/i,
    userMessage:
      "A service used for processing is temporarily unavailable.",
    action: "Try again in a few minutes.",
  },
  {
    pattern: /gemini|openai|anthropic|llm.*(error|fail)/i,
    userMessage: "The AI extraction service is temporarily unavailable.",
    action: "Try reprocessing in a few minutes.",
  },
  {
    pattern: /gcs|cloud.storage|bucket.*(error|fail)|upload.*failed|download.*failed/i,
    userMessage: "There was a problem accessing file storage.",
    action: "Try reprocessing. Contact support if it persists.",
  },
];

const FALLBACK: Omit<TranslatedError, "technicalDetail"> = {
  userMessage:
    "Something went wrong processing this invoice. Our team has been notified.",
  action: "You can try reprocessing, or contact support.",
};

/**
 * Translate a single raw error string into a user-friendly message.
 */
export function translateError(rawError: string): TranslatedError {
  const trimmed = rawError.trim();
  if (!trimmed) {
    return { ...FALLBACK, technicalDetail: rawError };
  }

  for (const rule of ERROR_RULES) {
    const match = trimmed.match(rule.pattern);
    if (match) {
      return {
        userMessage:
          typeof rule.userMessage === "function"
            ? rule.userMessage(match)
            : rule.userMessage,
        action:
          typeof rule.action === "function"
            ? rule.action(match)
            : rule.action,
        technicalDetail: rawError,
      };
    }
  }

  return { ...FALLBACK, technicalDetail: rawError };
}

/**
 * Split a semicolon-delimited error string (from validation warnings)
 * and translate each segment individually.
 */
export function translateValidationErrors(rawError: string): TranslatedError[] {
  return rawError
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((segment) => translateError(segment));
}
