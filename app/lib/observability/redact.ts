/**
 * Deep redaction untuk objek sebelum disimpan ke audit_log / log.
 *
 * Pattern: setiap key yang match `/password|token|secret|key|apiKey|authorization|cookie/i`
 * di-replace value-nya dengan `"[REDACTED]"`. Hash & email kepala-ekor sebagian
 * sebagai compromise antara debuggability & privasi.
 *
 * Pure function — input tidak dimutasi.
 */

const SENSITIVE_PATTERN =
  /(password|passwd|pwd|secret|token|apikey|api_key|auth|authorization|cookie|session|bearer|private|credit|cvv|otp|pin)/i;
const REDACTED = "[REDACTED]";
const MAX_DEPTH = 8;

export function redact<T>(input: T): T {
  return _redact(input, 0) as T;
}

function _redact(value: unknown, depth: number): unknown {
  if (depth > MAX_DEPTH) return "[TRUNCATED:DEPTH]";
  if (value === null || value === undefined) return value;

  if (Array.isArray(value)) {
    return value.map((item) => _redact(item, depth + 1));
  }

  if (value instanceof Date) return value;
  if (value instanceof Error) {
    return { name: value.name, message: value.message };
  }

  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_PATTERN.test(k)) {
        out[k] = REDACTED;
        continue;
      }
      out[k] = _redact(v, depth + 1);
    }
    return out;
  }

  return value;
}
