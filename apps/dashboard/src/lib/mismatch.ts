/** Header-level invoice charges parsed from metadata["Invoice Information"]. */
export interface InvoiceCharges {
  tax: number;
  freight: number;
  shipping: number;
  discount: number;
}

/**
 * Parse a currency string like "$7.99" or "7,999.00" into a number.
 * Returns 0 for null/undefined/unparseable values.
 * Mirrors ValidateStep._parse_currency in the Python backend.
 */
function parseCurrency(value: unknown): number {
  if (value == null) return 0;
  const cleaned = String(value).replace(/[$€£¥₹₩₺₽₫₱₴₨,]/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Extract header-level charges from invoice metadata.
 * Returns zeroed-out charges if metadata is missing or malformed.
 */
export function parseInvoiceCharges(
  metadata: Record<string, unknown> | null | undefined
): InvoiceCharges {
  const info = (metadata?.["Invoice Information"] ?? {}) as Record<
    string,
    unknown
  >;
  return {
    tax: parseCurrency(info.tax),
    freight: parseCurrency(info.freight),
    shipping: parseCurrency(info.shipping),
    discount: parseCurrency(info.discount),
  };
}

type LineItemLike = {
  extended_price: number | null;
  tax_amount?: number | null;
};

/**
 * Compute mismatch details or null if totals match.
 *
 * Formula: lineTotal + tax + freight + shipping - discount
 * Tax: per-line tax_amount preferred; header tax as fallback.
 * Penny tolerance: abs(expected - computed) <= 0.015 (accounts for floating-point precision).
 */
export function computeMismatchDetails(
  totalAmount: number | null | undefined,
  items: LineItemLike[],
  charges?: InvoiceCharges
): { expectedTotal: number; computedTotal: number } | null {
  if (totalAmount == null) return null;
  const pricedItems = items.filter((i) => i.extended_price != null);
  if (pricedItems.length === 0) return null;

  const lineTotal = pricedItems.reduce(
    (s, i) => s + (i.extended_price ?? 0),
    0
  );
  const hasLineTax = pricedItems.some((i) => i.tax_amount != null);
  const lineTax = pricedItems.reduce(
    (s, i) => s + (i.tax_amount ?? 0),
    0
  );

  const c = charges ?? { tax: 0, freight: 0, shipping: 0, discount: 0 };
  const tax = hasLineTax ? lineTax : c.tax;

  const computed =
    Math.round((lineTotal + tax + c.freight + c.shipping - c.discount) * 100) /
    100;
  const expected = Math.round(totalAmount * 100) / 100;

  if (Math.abs(expected - computed) <= 0.015) return null;
  return { expectedTotal: expected, computedTotal: computed };
}

/**
 * Boolean wrapper — true when a mismatch exists.
 * Used by the API route to persist has_total_mismatch.
 */
export function computeHasMismatch(
  totalAmount: number | null | undefined,
  items: LineItemLike[],
  charges?: InvoiceCharges
): boolean {
  return computeMismatchDetails(totalAmount, items, charges) !== null;
}
