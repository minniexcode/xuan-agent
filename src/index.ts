/**
 * 玄枢（xuan-agent）SDK 入口。
 *
 * 只有本文件（以及 package.json `exports` 中列出的 `./schemas`）是公开 API；
 * 内部模块不得被调用方直接依赖。
 */

export type { XuanAgent, XuanAgentOptions } from "./agent/index.js";
export { createXuanAgent } from "./agent/index.js";
export type { ConfigDoctorReport, ConfigSummary, XuanConfig } from "./config/index.js";
export { diagnoseConfig, getConfigSummary, loadEnvFile, resolveConfig } from "./config/index.js";
export type { XuanErrorCode, XuanErrorShape, XuanErrorStage } from "./errors/index.js";
export { XUAN_ERROR_CODES, XuanError } from "./errors/index.js";
export type {
  BirthInput,
  CalendarType,
  Gender,
  OutputMode,
  ProviderName,
} from "./schemas/index.js";
export { BirthInputSchema } from "./schemas/index.js";

export { VERSION } from "./version.js";
