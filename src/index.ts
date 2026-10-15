/**
 * 玄枢（xuan-agent）SDK 入口。
 *
 * 只有本文件（以及 package.json `exports` 中列出的 `./schemas`）是公开 API；
 * 内部模块不得被调用方直接依赖。
 */

export type { XuanAgent, XuanAgentOptions } from "./agent/index.js";
export { createXuanAgent } from "./agent/index.js";
export type { BaziCalculator } from "./calculators/index.js";
export { Tyme4tsBaziCalculator } from "./calculators/index.js";
export type { ConfigDoctorReport, ConfigSummary, XuanConfig } from "./config/index.js";
export { diagnoseConfig, getConfigSummary, loadEnvFile, resolveConfig } from "./config/index.js";
export type { XuanErrorCode, XuanErrorShape, XuanErrorStage } from "./errors/index.js";
export { XUAN_ERROR_CODES, XuanError } from "./errors/index.js";
export type { RenderedPrompt } from "./prompts/index.js";
export { PromptManager } from "./prompts/index.js";
export type {
  LlmProvider,
  LlmTextOutput,
  ProviderCapabilities,
  TextLlmInput,
  TextLlmMessage,
} from "./providers/index.js";
export {
  MockProvider,
  OpenAiCompatibleProvider,
  ProviderFactory,
} from "./providers/index.js";
export type {
  CitationContentKind,
  CopyrightStatus,
  KnowledgeChunk,
  KnowledgeDomain,
  RagSearchOptions,
  RagSearchResult,
} from "./rag/index.js";
export { RagEngine } from "./rag/index.js";
export type { SafetyAudit } from "./safety/index.js";
export { SafetyGuard } from "./safety/index.js";
export type {
  AnalysisRequest,
  AnalysisResult,
  AnalysisSection,
  FollowupInput,
  RagCitation,
} from "./schemas/analysis.js";
export { BOUNDARY_NOTICE } from "./schemas/analysis.js";
export type {
  BaziChart,
  BaziChartSource,
  FiveElementName,
  LuckPillar,
  Pillar,
  TenGodRelation,
} from "./schemas/bazi.js";
export type {
  BirthInput,
  BirthInputRequest,
  CalendarType,
  Gender,
  OutputMode,
  ProviderName,
} from "./schemas/index.js";
export { BirthInputSchema } from "./schemas/index.js";

export { VERSION } from "./version.js";
