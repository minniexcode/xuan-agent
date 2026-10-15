import { redactObject } from "./redaction.js";

/** All supported log levels, ordered from most to least verbose. */
export const LOG_LEVELS = ["debug", "info", "warn", "error", "silent"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

/** Numeric severity used to decide whether an entry passes the configured threshold. */
const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

/** Structured logger; `fields` are redacted before being emitted. */
export interface Logger {
  level: LogLevel;
  debug(message: string, fields?: Record<string, unknown>): void;
  info(message: string, fields?: Record<string, unknown>): void;
  warn(message: string, fields?: Record<string, unknown>): void;
  error(message: string, fields?: Record<string, unknown>): void;
}

/** Type guard for LogLevel, used when validating raw config strings. */
export function isLogLevel(value: string): value is LogLevel {
  return (LOG_LEVELS as readonly string[]).includes(value);
}

/**
 * Redacting logger. Writes to stderr so the CLI's stdout stays pure JSON under `--json`.
 */
export function createLogger(level: LogLevel = "info"): Logger {
  const write = (entryLevel: LogLevel, message: string, fields?: Record<string, unknown>): void => {
    // Drop entries below the configured threshold (e.g. debug when level is "info").
    if (LEVEL_ORDER[entryLevel] < LEVEL_ORDER[level]) return;
    const parts = [entryLevel.toUpperCase(), message];
    if (fields && Object.keys(fields).length > 0) {
      parts.push(JSON.stringify(redactObject(fields)));
    }
    process.stderr.write(`${parts.join(" ")}\n`);
  };

  return {
    level,
    debug: (m, f) => write("debug", m, f),
    info: (m, f) => write("info", m, f),
    warn: (m, f) => write("warn", m, f),
    error: (m, f) => write("error", m, f),
  };
}
