/**
 * Exhaustive set of error codes (FR-LLM-01 / technical-design.md §17.6).
 * The union is exhaustive on purpose so callers can switch on it without a default.
 */
export const XUAN_ERROR_CODES = [
  "VALIDATION_ERROR",
  "CALCULATION_ERROR",
  "PROVIDER_CONFIG_ERROR",
  "PROVIDER_CAPABILITY_ERROR",
  "LLM_ERROR",
  "RAG_NO_RESULT",
  "PROFILE_PERMISSION_REQUIRED",
  "SAFETY_BLOCKED",
  "STORAGE_ERROR",
] as const;

export type XuanErrorCode = (typeof XUAN_ERROR_CODES)[number];

/** The stage where an error occurred, for logging and diagnostics. */
export type XuanErrorStage =
  | "input"
  | "calculation"
  | "rag"
  | "prompt"
  | "llm"
  | "output"
  | "storage"
  | "profile"
  | "safety"
  | "config";
