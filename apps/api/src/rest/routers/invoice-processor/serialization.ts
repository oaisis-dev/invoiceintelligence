/**
 * Shared serialization helpers for route responses.
 * Translated from backend/api/src/routes/serialization.py.
 */

function serialize(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.map(serialize);
  }
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      result[k] = serialize(v);
    }
    return result;
  }
  return value;
}

/**
 * Convert an object to a JSON-serializable dict.
 * Handles Date -> ISO string conversion recursively.
 */
export function toDict(obj: Record<string, unknown>): Record<string, unknown> {
  return serialize(obj) as Record<string, unknown>;
}
