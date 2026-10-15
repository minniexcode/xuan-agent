export const REDACTED = "***";

/** 敏感字段名（大小写不敏感）。 */
const SECRET_KEY_PATTERN = /(api[_-]?key|apikey|secret|token|authorization|password|credential)/i;

export function isSecretKey(key: string): boolean {
  return SECRET_KEY_PATTERN.test(key);
}

/** 值本身不返回任何内容，只返回占位符——不泄露长度或前后缀。 */
export function redact(value: unknown): string {
  return value === undefined || value === null || value === "" ? "" : REDACTED;
}

/**
 * 递归地把敏感字段替换为占位符，用于日志与普通输出。
 * 见 product-architecture.md §8.3 与 §10。
 */
export function redactObject<T>(input: T): T {
  if (Array.isArray(input)) {
    return input.map((item) => redactObject(item)) as unknown as T;
  }
  if (input !== null && typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      out[key] = isSecretKey(key) ? redact(value) : redactObject(value);
    }
    return out as T;
  }
  return input;
}
