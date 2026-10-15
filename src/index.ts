/**
 * Xuan-agent (玄枢) SDK entry point.
 *
 * Only this file (plus the `./schemas` subpath listed in package.json `exports`) is public API;
 * internal modules must not be depended on directly by callers.
 *
 * Deliberately NOT exported: the `conversations/` and `profiles/` stores, `storage/`,
 * and `logging/` — these are internal implementation details, not part of the public surface.
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
  ProviderInfo,
  ProviderStatus,
  TextLlmInput,
  TextLlmMessage,
} from "./providers/index.js";
export {
  listProviders,
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
export type {
  ProfileInput,
  ProfilePreferences,
  SaveProfileOptions,
  UserProfile,
} from "./schemas/profile.js";

export { VERSION } from "./version.js";
