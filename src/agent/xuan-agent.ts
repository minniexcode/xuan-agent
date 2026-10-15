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
import type { BaziChart } from "../schemas/bazi.js";
import { type BirthInputRequest, BirthInputSchema } from "../schemas/index.js";

export interface XuanAgentOptions {
  /** 覆盖 .env 解析出的配置（优先级最高）。 */
  config?: Partial<XuanConfig>;
  logger?: Logger;
  /** 注入排盘实现，默认 Tyme4tsBaziCalculator。 */
  calculator?: BaziCalculator;
}

export interface XuanAgent {
  getConfigSummary(): Promise<ConfigSummary>;
  /** 排盘。输入不合法时抛 VALIDATION_ERROR（程序路径不追问，见 FR-BAZI-01）。 */
  analyzeBazi(input: BirthInputRequest): Promise<BaziChart>;
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

  logger.debug("XuanAgent 已创建", {
    provider: config.provider,
    model: config.model,
  });

  return {
    async getConfigSummary(): Promise<ConfigSummary> {
      return getConfigSummary(config);
    },
    async analyzeBazi(input: BirthInputRequest): Promise<BaziChart> {
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
      return calculator.calculate(parsed.data);
    },
  };
}
