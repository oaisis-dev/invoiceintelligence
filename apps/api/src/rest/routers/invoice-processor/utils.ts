/**
 * Shared utilities for InvoiceProcessor route handlers.
 */

/**
 * Strip null/undefined values from a request body object.
 * Mirrors the Python pattern of `body.model_dump(exclude_none=True)`.
 */
export function stripNulls(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v != null),
  );
}
