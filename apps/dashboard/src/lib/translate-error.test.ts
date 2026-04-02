import { describe, it, expect } from "vitest";
import { translateError, translateValidationErrors } from "./translate-error";

// ---------------------------------------------------------------------------
// translateError — processing failures
// ---------------------------------------------------------------------------

describe("translateError", () => {
  it("translates 'No raw text available' extraction error", () => {
    const result = translateError("No raw text available for extraction");
    expect(result.userMessage).toContain("couldn't read any text");
    expect(result.action).toContain("re-uploading");
    expect(result.technicalDetail).toBe("No raw text available for extraction");
  });

  it("translates step timeout error", () => {
    const result = translateError("Step 'ocr' timed out after 300.0s");
    expect(result.userMessage).toContain("took too long");
    expect(result.action).toContain("reprocessing");
    expect(result.technicalDetail).toBe("Step 'ocr' timed out after 300.0s");
  });

  it("translates invoice not found error", () => {
    const result = translateError(
      "Invoice abc-123-def not found"
    );
    expect(result.userMessage).toContain("could not be found");
    expect(result.action).toContain("deleted");
  });

  it("translates date/time out of range (Postgres error)", () => {
    const result = translateError(
      'date/time field value out of range: "2025-31-12"'
    );
    expect(result.userMessage).toContain("date");
    expect(result.userMessage).toContain("don't recognize");
    expect(result.action).toContain("manually");
  });

  it("translates compound error (Original + DB also failed)", () => {
    const result = translateError(
      "Original: OCR timeout; DB also failed: connection refused"
    );
    expect(result.userMessage).toContain("couldn't be saved");
    expect(result.action).toContain("reprocessing");
  });

  // ---------------------------------------------------------------------------
  // translateError — email / attachment errors
  // ---------------------------------------------------------------------------

  it("translates duplicate file hash skip", () => {
    const result = translateError(
      "Skipped duplicate upload by file hash (existing invoice abc-123)"
    );
    expect(result.userMessage).toContain("already uploaded");
    expect(result.action).toContain("No action needed");
  });

  it("translates 'Sender not in approved list'", () => {
    const result = translateError("Sender not in approved list");
    expect(result.userMessage).toContain("unrecognized sender");
    expect(result.action).toContain("approved email list");
  });

  it("translates 'Not a PDF file'", () => {
    const result = translateError("Not a PDF file");
    expect(result.userMessage).toContain("not a PDF");
    expect(result.action).toContain("Only PDF");
  });

  // ---------------------------------------------------------------------------
  // translateError — validation warnings
  // ---------------------------------------------------------------------------

  it("translates missing invoice field: date", () => {
    const result = translateError("Missing invoice field: date");
    expect(result.userMessage).toContain("date");
    expect(result.userMessage).toContain("couldn't find");
    expect(result.action).toContain("manually");
  });

  it("translates missing invoice field: number", () => {
    const result = translateError("Missing invoice field: number");
    expect(result.userMessage).toContain("invoice number");
  });

  it("translates missing invoice field: total", () => {
    const result = translateError("Missing invoice field: total");
    expect(result.userMessage).toContain("total amount");
  });

  it("translates missing vendor field: name", () => {
    const result = translateError("Missing vendor field: name");
    expect(result.userMessage).toContain("vendor");
    expect(result.userMessage).toContain("name");
  });

  it("translates 'No line items extracted'", () => {
    const result = translateError("No line items extracted");
    expect(result.userMessage).toContain("line items");
    expect(result.action).toContain("manually");
  });

  // ---------------------------------------------------------------------------
  // translateError — OCR / quality
  // ---------------------------------------------------------------------------

  it("translates 'OCR confidence below threshold'", () => {
    const result = translateError("OCR confidence below threshold");
    expect(result.userMessage).toContain("scan quality");
    expect(result.action).toContain("clearer scan");
  });

  // ---------------------------------------------------------------------------
  // translateError — queue / upload
  // ---------------------------------------------------------------------------

  it("translates 'Failed to queue job'", () => {
    const result = translateError(
      "Failed to queue job: insert error on processing_jobs"
    );
    expect(result.userMessage).toContain("couldn't be queued");
    expect(result.action).toContain("re-uploading");
  });

  // ---------------------------------------------------------------------------
  // translateError — provider / infrastructure
  // ---------------------------------------------------------------------------

  it("translates IMAP connection error", () => {
    const result = translateError(
      "IMAP connection refused: ssl handshake failed"
    );
    expect(result.userMessage).toContain("email server");
    expect(result.action).toContain("email intake settings");
  });

  it("translates Google Vision API error", () => {
    const result = translateError(
      "google.cloud.vision API returned 503"
    );
    expect(result.userMessage).toContain("temporarily unavailable");
  });

  it("translates rate limit / 429 error", () => {
    const result = translateError("Request failed with status 429");
    expect(result.userMessage).toContain("temporarily unavailable");
    expect(result.action).toContain("few minutes");
  });

  it("translates Gemini LLM error", () => {
    const result = translateError(
      "gemini-1.5-pro returned 500: internal error"
    );
    expect(result.userMessage).toContain("AI extraction");
    expect(result.action).toContain("reprocessing");
  });

  it("translates GCS storage error", () => {
    const result = translateError(
      "gcs upload failed: bucket not found"
    );
    expect(result.userMessage).toContain("file storage");
  });

  // ---------------------------------------------------------------------------
  // translateError — fallback
  // ---------------------------------------------------------------------------

  it("returns generic message for unknown error", () => {
    const result = translateError("some totally unexpected error xyz");
    expect(result.userMessage).toContain("Something went wrong");
    expect(result.action).toContain("reprocessing");
    expect(result.technicalDetail).toBe("some totally unexpected error xyz");
  });

  // ---------------------------------------------------------------------------
  // translateError — edge cases
  // ---------------------------------------------------------------------------

  it("preserves the raw error in technicalDetail for all cases", () => {
    const raw = "Step 'extraction' timed out after 300.0s";
    const result = translateError(raw);
    expect(result.technicalDetail).toBe(raw);
  });

  it("handles empty string", () => {
    const result = translateError("");
    expect(result.userMessage).toContain("Something went wrong");
  });

  it("handles whitespace-only string", () => {
    const result = translateError("   ");
    expect(result.userMessage).toContain("Something went wrong");
  });
});

// ---------------------------------------------------------------------------
// translateValidationErrors
// ---------------------------------------------------------------------------

describe("translateValidationErrors", () => {
  it("translates a single validation error", () => {
    const results = translateValidationErrors("Missing invoice field: date");
    expect(results).toHaveLength(1);
    expect(results[0].userMessage).toContain("date");
  });

  it("translates semicolon-delimited validation errors", () => {
    const results = translateValidationErrors(
      "Missing invoice field: date; Missing vendor field: name; No line items extracted"
    );
    expect(results).toHaveLength(3);
    expect(results[0].userMessage).toContain("date");
    expect(results[1].userMessage).toContain("vendor");
    expect(results[2].userMessage).toContain("line items");
  });

  it("handles mixed known and unknown errors", () => {
    const results = translateValidationErrors(
      "Missing invoice field: total; Something unexpected happened"
    );
    expect(results).toHaveLength(2);
    expect(results[0].userMessage).toContain("total amount");
    expect(results[1].userMessage).toContain("Something went wrong");
  });

  it("handles empty string", () => {
    const results = translateValidationErrors("");
    expect(results).toHaveLength(0);
  });

  it("handles trailing and leading semicolons", () => {
    const results = translateValidationErrors(
      "; Missing invoice field: number ; "
    );
    expect(results).toHaveLength(1);
    expect(results[0].userMessage).toContain("invoice number");
  });
});
