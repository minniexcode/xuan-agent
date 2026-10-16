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
import { ProfileStore } from "../profiles/index.js";
import { PromptManager, parseSections } from "../prompts/index.js";
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
  type RagCitation,
} from "../schemas/analysis.js";
import type { BaziChart } from "../schemas/bazi.js";
import { type BirthInputRequest, BirthInputSchema } from "../schemas/index.js";
import {
  type ProfileInput,
  ProfilePreferencesSchema,
  type SaveProfileOptions,
  type UserProfile,
} from "../schemas/profile.js";

/**
 * Construction options for `createXuanAgent`. Every collaborator is
 * overridable so tests can inject mocks (dependency injection).
 */
export interface XuanAgentOptions {
  /** Overrides merged on top of the .env-derived config (highest priority). */
  config?: Partial<XuanConfig>;
  /** Logger override; defaults to one built from `config.logLevel`. */
  logger?: Logger;
  /** Calculator override; defaults to `Tyme4tsBaziCalculator`. */
  calculator?: BaziCalculator;
  /** Injected LLM provider, overriding `ProviderFactory` (for tests). */
  provider?: LlmProvider;
  /** Injected RAG engine (for tests and custom knowledge bases). */
  ragEngine?: RagEngine;
  /** Injected conversation store (for tests and custom session dirs). */
  conversationStore?: ConversationStore;
  /** Injected profile store (for tests and custom profile dirs). */
  profileStore?: ProfileStore;
}

/**
 * Public SDK surface of the agent. Entry layers (CLI / HTTP) call only these
 * methods — never the calculator, RAG, storage or provider directly.
 */
export interface XuanAgent {
  /** Non-secret config summary for `xuan config doctor` (FR-LLM-01). */
  getConfigSummary(): Promise<ConfigSummary>;
  /** Validate input, calculate the chart, interpret, audit and persist session. */
  analyzeBazi(
    input: BirthInputRequest,
    request?: Partial<AnalysisRequest>,
  ): Promise<AnalysisResult<BaziChart>>;
  /** Continue a stored session with a follow-up question (FR-BAZI-05). */
  askFollowup(input: FollowupInput): Promise<AnalysisResult<BaziChart>>;
  /** Query the RAG knowledge base directly (FR-RAG-02). */
  searchRag(options: RagSearchOptions): Promise<RagSearchResult>;
  /** Load a saved profile for `userId`, or null when absent (FR-MEM-02). */
  getProfile(userId?: string): Promise<UserProfile | null>;
  /** Persist a profile; requires explicit confirm (FR-MEM-02). */
  saveProfile(input: ProfileInput, options?: SaveProfileOptions): Promise<UserProfile>;
  /** Delete a profile; requires explicit confirm (FR-MEM-02). */
  deleteProfile(userId?: string, options?: SaveProfileOptions): Promise<void>;
  /** Clear one session, or all sessions when `sessionId` is omitted (FR-MEM-01). */
  clearSessions(sessionId?: string): Promise<void>;
}

/**
 * Shallow-merge config overrides, skipping keys explicitly set to `undefined`
 * so a partial override never blanks an existing value.
 */
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

/**
 * Build the agent: resolve config, wire collaborators (each overridable via
 * `options` for dependency injection in tests), and return the SDK surface.
 */
export function createXuanAgent(options: XuanAgentOptions = {}): XuanAgent {
  const config = mergeConfig(resolveConfig(), options.config);
  const logger = options.logger ?? createLogger(config.logLevel);
  const calculator = options.calculator ?? new Tyme4tsBaziCalculator();
  const promptManager = new PromptManager();
  const safetyGuard = new SafetyGuard();

  // Lazily create the provider: `config doctor` needs no provider, and this
  // avoids requiring an API key up front unless a call actually invokes the LLM.
  let provider = options.provider;
  const getProvider = (): LlmProvider => {
    provider ??= ProviderFactory.create(config);
    return provider;
  };

  const ragEngine = options.ragEngine ?? new RagEngine({ knowledgeDir: config.paths.knowledgeDir });
  // Session and profile stores are likewise created on first use, so commands
  // that never touch them leave the filesystem alone.
  let conversationStore = options.conversationStore;
  const getConversationStore = (): ConversationStore => {
    conversationStore ??= new ConversationStore(config.paths.sessionsDir);
    return conversationStore;
  };
  let profileStore = options.profileStore;
  const getProfileStore = (): ProfileStore => {
    profileStore ??= new ProfileStore(config.paths.profilesDir);
    return profileStore;
  };

  /**
   * Advanced-mode RAG citations: build the query from the day master plus the
   * chart's Ten Gods (十神) as a heuristic term set. Beginner mode does not search.
   */
  async function searchChartCitations(chart: BaziChart, topK = 5): Promise<RagCitation[]> {
    const terms = [chart.dayMaster, ...chart.tenGods.map((relation) => relation.tenGod)];
    const query = [...new Set(terms)].filter(Boolean).join(" ");
    const result = await ragEngine.search({ query, topK });
    return result.citations;
  }

  logger.debug("XuanAgent 已创建", { provider: config.provider, model: config.model });

  /**
   * Assemble the standard `AnalysisResult` envelope shared by analyze and
   * follow-up, stamping id, timestamp and provider metadata.
   */
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
        ...parseSections(outputText),
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
    /** Non-secret config summary for `xuan config doctor` (FR-LLM-01). */
    async getConfigSummary(): Promise<ConfigSummary> {
      return getConfigSummary(config);
    },

    /** Validate → calculate → interpret → audit → persist, returning the result. */
    async analyzeBazi(
      input: BirthInputRequest,
      request: Partial<AnalysisRequest> = {},
    ): Promise<AnalysisResult<BaziChart>> {
      // Program-path callers must pass complete input; gaps are an error here,
      // not a clarification prompt (requirements.md "输入处理").
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

      let chart: BaziChart;
      try {
        chart = calculator.calculate(parsed.data);
      } catch (err) {
        // A valid input the library cannot compute is a calculation failure, not an
        // input error — and it must stop before the LLM is called (FR-BAZI-02).
        throw XuanError.from(err, {
          code: "CALCULATION_ERROR",
          message: "排盘失败",
          stage: "calculation",
          recoverable: false,
        });
      }
      const mode = request.mode ?? parsed.data.mode ?? "advanced";
      const llm = getProvider();
      // Advanced mode attaches RAG citations; beginner mode skips retrieval.
      // Authority is FR-RAG-02 rule 2 ("通俗模式只给简短来源；进阶模式可展开原文与释义").
      // NOTE: FR-BAZI-04 still lists "RAG 引用" under 明确不做（V1）— that line predates RAG
      // landing and is now stale; FR-RAG-02 governs.
      const citations = mode !== "beginner" ? await searchChartCitations(chart) : [];
      const { input: promptInput, version } = promptManager.buildBaziPrompt(chart, mode, citations);

      const started = Date.now();
      const output = await llm.invokeText(promptInput);
      const audit = safetyGuard.auditOutput(output.text);
      const sessionId = request.sessionId ?? `sess-${randomUUID()}`;
      const durationMs = Date.now() - started;

      // Auto-persist the session — follow-ups depend on it (FR-MEM-01).
      // `temporary: true` is the privacy escape hatch that skips persistence (ADR-0008).
      if (request.temporary !== true) {
        await getConversationStore().save({
          sessionId,
          skill: "bazi",
          chart,
          mode,
          provider: llm.name,
          model: llm.model,
          ragHits: citations,
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
        citations,
        audit.warnings,
        audit.blocked,
        version,
        durationMs,
        citations.length > 0,
      );
    },

    /** Reuse the stored chart and answer a follow-up question (FR-BAZI-05). */
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

      // Same-chart reuse: never re-calculate within a session (FR-BAZI-05).
      const chart = state.chart;
      const mode = input.mode ?? state.mode ?? "advanced";

      // RAG is on-demand: only retrieved when the follow-up hits known terminology (FR-BAZI-05 rule 2).
      const citations = ragEngine.hasTerminologyHit(input.question)
        ? (await ragEngine.search({ query: input.question, topK: 3 })).citations
        : [];

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

    /** Direct RAG search passthrough (FR-RAG-02). */
    async searchRag(options: RagSearchOptions): Promise<RagSearchResult> {
      return ragEngine.search(options);
    },

    /** Load the saved profile for `userId`, or null when absent (FR-MEM-02). */
    async getProfile(userId = "default"): Promise<UserProfile | null> {
      const found = await getProfileStore().load(userId);
      return found ?? null;
    },

    /** Persist a profile; refuses unless `confirm` is true (FR-MEM-02). */
    async saveProfile(input: ProfileInput, options: SaveProfileOptions = {}): Promise<UserProfile> {
      // Explicit user confirmation is required before writing a profile
      // (FR-MEM-02 / ADR-0008).
      if (options.confirm !== true) {
        throw new XuanError({
          code: "PROFILE_PERMISSION_REQUIRED",
          message: "保存档案需显式确认（--confirm）",
          stage: "profile",
          recoverable: true,
        });
      }
      const birth = BirthInputSchema.safeParse(input.birth);
      if (!birth.success) {
        throw new XuanError({
          code: "VALIDATION_ERROR",
          message: birth.error.issues.map((issue) => issue.message).join("；"),
          stage: "input",
          recoverable: true,
        });
      }
      const preferences = ProfilePreferencesSchema.safeParse(input.preferences);
      if (!preferences.success) {
        throw new XuanError({
          code: "VALIDATION_ERROR",
          message: preferences.error.issues.map((issue) => issue.message).join("；"),
          stage: "input",
          recoverable: true,
        });
      }

      const userId = input.userId ?? "default";
      const store = getProfileStore();
      const existing = await store.load(userId);
      const now = new Date().toISOString();
      const profile: UserProfile = {
        userId,
        birth: birth.data,
        preferences: preferences.data,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      await store.save(profile);
      return profile;
    },

    /** Delete a profile; refuses unless `confirm` is true (FR-MEM-02). */
    async deleteProfile(userId = "default", options: SaveProfileOptions = {}): Promise<void> {
      // Deletion is likewise gated on explicit confirmation (FR-MEM-02 / ADR-0008).
      if (options.confirm !== true) {
        throw new XuanError({
          code: "PROFILE_PERMISSION_REQUIRED",
          message: "删除档案需显式确认（--confirm）",
          stage: "profile",
          recoverable: true,
        });
      }
      await getProfileStore().delete(userId);
    },

    /** Clear one session, or all when `sessionId` is omitted (FR-MEM-01's `xuan session clear`). */
    async clearSessions(sessionId?: string): Promise<void> {
      await getConversationStore().clear(sessionId);
    },
  };
}
