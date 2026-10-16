/** Replacement token used for every redacted secret value. */
export const REDACTED = "***";

/** Sensitive field-name pattern (case-insensitive). */
const SECRET_KEY_PATTERN = /(api[_-]?key|apikey|secret|token|authorization|password|credential)/i;
/** Personal-data field-name pattern (case-insensitive): birth info, location and profile. */
const PERSONAL_KEY_PATTERN =
  /(birth|birthday|birthdate|date|time|place|location|address|profile|user\s?id|userid|nickname|name|gender|calendar)/i;

/** True when a field name looks like a secret and its value should be redacted. */
export function isSecretKey(key: string): boolean {
  return SECRET_KEY_PATTERN.test(key);
}

/** True when a field name looks like either a secret or personal data. */
function isSensitiveKey(key: string): boolean {
  return isSecretKey(key) || PERSONAL_KEY_PATTERN.test(key);
}

/**
 * Return only a placeholder for a value — deliberately leaking neither its length
 * nor any prefix/suffix.
 */
export function redact(value: unknown): string {
  return value === undefined || value === null || value === "" ? "" : REDACTED;
}

/**
 * Recursively replace sensitive fields with the placeholder, for logs and ordinary output.
 * See product-architecture.md §8.3 and §10.
 */
export function redactObject<T>(input: T): T {
  if (Array.isArray(input)) {
    return input.map((item) => redactObject(item)) as unknown as T;
  }
  if (input !== null && typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      out[key] = isSensitiveKey(key) ? redact(value) : redactObject(value);
    }
    return out as T;
  }
  return input;
}
