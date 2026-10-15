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

/** 错误发生所在的阶段，用于日志与诊断。 */
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
