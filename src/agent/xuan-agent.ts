import { randomUUID } from "node:crypto";
import type { BaziCalculator } from "../calculators/bazi-calculator.js";
import { Tyme4tsBaziCalculator } from "../calculators/index.js";
import {
  type ConfigSummary,
  getConfigSummary,
  resolveConfig,
  type XuanConfig,
} from "../config/index.js";
import { XuanError } from "../errors/index.js";
import { createLogger, type Logger } from "../logging/index.js";
import { PromptManager } from "../prompts/index.js";
import { ProviderFactory } from "../providers/index.js";
import type { LlmProvider } from "../providers/provider.types.js";
import { SafetyGuard } from "../safety/index.js";
import { type AnalysisRequest, type AnalysisResult, BOUNDARY_NOTICE } from "../schemas/analysis.js";
import type { BaziChart } from "../schemas/bazi.js";
import { type BirthInputRequest, BirthInputSchema } from "../schemas/index.js";

export interface XuanAgentOptions {
  /** 覆盖 .env 解析出的配置（优先级最高）。 */
  config?: Partial<XuanConfig>;
  logger?: Logger;
  calculator?: BaziCalculator;
  /** 注入 Provider，覆盖 ProviderFactory（用于测试）。 */
  provider?: LlmProvider;
}

export interface XuanAgent {
  getConfigSummary(): Promise<ConfigSummary>;
  analyzeBazi(
    input: BirthInputRequest,
    request?: Partial<AnalysisRequest>,
  ): Promise<AnalysisResult<BaziChart>>;
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

  logger.debug("XuanAgent 已创建", { provider: config.provider, model: config.model });

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
      const id = randomUUID();

      return {
        id,
        sessionId: request.sessionId ?? `sess-${id}`,
        skill: "bazi",
        provider: { name: llm.name, model: llm.model },
        mode,
        structured: chart,
        content: {
          summary: output.text,
          sections: [],
          followupQuestions: [],
          boundaryNotice: BOUNDARY_NOTICE,
        },
        citations: [],
        safety: { boundaryApplied: true, warnings: audit.warnings, blocked: audit.blocked },
        metadata: {
          createdAt: new Date().toISOString(),
          durationMs: Date.now() - started,
          promptVersion: version,
          ragUsed: false,
        },
      };
    },
  };
}
