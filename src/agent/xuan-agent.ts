import { randomUUID } from "node:crypto";
import type { BaziCalculator } from "../calculators/bazi-calculator.js";
import { Tyme4tsBaziCalculator } from "../calculators/index.js";
import {
  type ConfigSummary,
  getConfigSummary,
  resolveConfig,
  type XuanConfig,
} from "../config/index.js";
import type { ConversationState } from "../conversations/index.js";
import { ConversationStore } from "../conversations/index.js";
import { XuanError } from "../errors/index.js";
import { createLogger, type Logger } from "../logging/index.js";
import { PromptManager } from "../prompts/index.js";
import { ProviderFactory } from "../providers/index.js";
import type { LlmProvider } from "../providers/provider.types.js";
import type { RagSearchOptions, RagSearchResult } from "../rag/index.js";
import { RagEngine } from "../rag/index.js";
import { SafetyGuard } from "../safety/index.js";
import {
  type AnalysisRequest,
  type AnalysisResult,
  BOUNDARY_NOTICE,
  type FollowupInput,
} from "../schemas/analysis.js";
import type { BaziChart } from "../schemas/bazi.js";
import { type BirthInputRequest, BirthInputSchema } from "../schemas/index.js";

export interface XuanAgentOptions {
  /** 覆盖 .env 解析出的配置（优先级最高）。 */
  config?: Partial<XuanConfig>;
  logger?: Logger;
  calculator?: BaziCalculator;
  /** 注入 Provider，覆盖 ProviderFactory（用于测试）。 */
  provider?: LlmProvider;
  /** 注入 RAG 引擎（用于测试与自定义知识库）。 */
  ragEngine?: RagEngine;
  /** 注入会话存储（用于测试与自定义会话目录）。 */
  conversationStore?: ConversationStore;
}

export interface XuanAgent {
  getConfigSummary(): Promise<ConfigSummary>;
  analyzeBazi(
    input: BirthInputRequest,
    request?: Partial<AnalysisRequest>,
  ): Promise<AnalysisResult<BaziChart>>;
  askFollowup(input: FollowupInput): Promise<AnalysisResult<BaziChart>>;
  searchRag(options: RagSearchOptions): Promise<RagSearchResult>;
}

function mergeConfig(base: XuanConfig, overrides?: Partial<XuanConfig>): XuanConfig {
  if (overrides === undefined) return base;
  const merged: XuanConfig = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    if (value !== undefined) {
      Object.assign(merged, { [key]: value });
    }
  }
  return merged;
}

export function createXuanAgent(options: XuanAgentOptions = {}): XuanAgent {
  const config = mergeConfig(resolveConfig(), options.config);
  const logger = options.logger ?? createLogger(config.logLevel);
  const calculator = options.calculator ?? new Tyme4tsBaziCalculator();
  const promptManager = new PromptManager();
  const safetyGuard = new SafetyGuard();

  // 惰性创建：`config doctor` 不需要 Provider，也避免 mock 之外提前要求 API key。
  let provider = options.provider;
  const getProvider = (): LlmProvider => {
    provider ??= ProviderFactory.create(config);
    return provider;
  };

  const ragEngine = options.ragEngine ?? new RagEngine({ knowledgeDir: config.paths.knowledgeDir });
  let conversationStore = options.conversationStore;
  const getConversationStore = (): ConversationStore => {
    conversationStore ??= new ConversationStore(config.paths.sessionsDir);
    return conversationStore;
  };

  logger.debug("XuanAgent 已创建", { provider: config.provider, model: config.model });

  function toResult(
    llm: LlmProvider,
    chart: BaziChart,
    sessionId: string,
    mode: AnalysisRequest["mode"],
    outputText: string,
    citations: AnalysisResult["citations"],
    warnings: string[],
    blocked: boolean,
    promptVersion: string,
    durationMs: number,
    ragUsed: boolean,
  ): AnalysisResult<BaziChart> {
    return {
      id: randomUUID(),
      sessionId,
      skill: "bazi",
      provider: { name: llm.name, model: llm.model },
      mode,
      structured: chart,
      content: {
        summary: outputText,
        sections: [],
        followupQuestions: [],
        boundaryNotice: BOUNDARY_NOTICE,
      },
      citations,
      safety: { boundaryApplied: true, warnings, blocked },
      metadata: {
        createdAt: new Date().toISOString(),
        durationMs,
        promptVersion,
        ragUsed,
      },
    };
  }

  return {
    async getConfigSummary(): Promise<ConfigSummary> {
      return getConfigSummary(config);
    },

    async analyzeBazi(
      input: BirthInputRequest,
      request: Partial<AnalysisRequest> = {},
    ): Promise<AnalysisResult<BaziChart>> {
      const parsed = BirthInputSchema.safeParse(input);
      if (!parsed.success) {
        throw new XuanError({
          code: "VALIDATION_ERROR",
          message: parsed.error.issues.map((issue) => issue.message).join("；"),
          stage: "input",
          recoverable: true,
          details: { issues: parsed.error.issues },
        });
      }

      const chart = calculator.calculate(parsed.data);
      const mode = request.mode ?? parsed.data.mode ?? "advanced";
      const llm = getProvider();
      const { input: promptInput, version } = promptManager.buildBaziPrompt(chart, mode);

      const started = Date.now();
      const output = await llm.invokeText(promptInput);
      const audit = safetyGuard.auditOutput(output.text);
      const sessionId = request.sessionId ?? `sess-${randomUUID()}`;
      const durationMs = Date.now() - started;

      // 自动写入会话，追问依赖它（FR-MEM-01）；`temporary: true` 跳过持久化（隐私模式）。
      if (request.temporary !== true) {
        await getConversationStore().save({
          sessionId,
          skill: "bazi",
          chart,
          mode,
          provider: llm.name,
          model: llm.model,
          ragHits: [],
          safetyWarnings: audit.warnings,
          updatedAt: new Date().toISOString(),
        });
      }

      return toResult(
        llm,
        chart,
        sessionId,
        mode,
        output.text,
        [],
        audit.warnings,
        audit.blocked,
        version,
        durationMs,
        false,
      );
    },

    async askFollowup(input: FollowupInput): Promise<AnalysisResult<BaziChart>> {
      const store = getConversationStore();
      const state =
        input.sessionId !== undefined
          ? await store.load(input.sessionId)
          : await store.loadLatest();
      if (state?.chart === undefined) {
        throw new XuanError({
          code: "STORAGE_ERROR",
          message: "找不到会话上下文（请先 xuan bazi analyze，或用 --session 指定）",
          stage: "storage",
          recoverable: true,
        });
      }

      const chart = state.chart;
      const mode = input.mode ?? state.mode ?? "advanced";

      // RAG 按需：仅当追问能命中术语 / 依据时引用（FR-BAZI-05）。
      const ragResult = await ragEngine.search({ query: input.question, topK: 3 });
      const citations = ragResult.citations;

      const llm = getProvider();
      const { input: promptInput, version } = promptManager.buildFollowupPrompt(
        chart,
        input.question,
        mode,
        citations,
      );

      const started = Date.now();
      const output = await llm.invokeText(promptInput);
      const audit = safetyGuard.auditOutput(output.text);

      await store.save({
        sessionId: state.sessionId,
        skill: "bazi",
        question: input.question,
        chart,
        mode,
        provider: llm.name,
        model: llm.model,
        ragHits: citations,
        safetyWarnings: audit.warnings,
        updatedAt: new Date().toISOString(),
      } satisfies ConversationState);

      return toResult(
        llm,
        chart,
        state.sessionId,
        mode,
        output.text,
        citations,
        audit.warnings,
        audit.blocked,
        version,
        Date.now() - started,
        citations.length > 0,
      );
    },

    async searchRag(options: RagSearchOptions): Promise<RagSearchResult> {
      return ragEngine.search(options);
    },
  };
}
