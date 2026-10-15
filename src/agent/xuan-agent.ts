import {
  type ConfigSummary,
  getConfigSummary,
  resolveConfig,
  type XuanConfig,
} from "../config/index.js";
import { createLogger, type Logger } from "../logging/index.js";

export interface XuanAgentOptions {
  /** 覆盖 .env 解析出的配置（优先级最高）。 */
  config?: Partial<XuanConfig>;
  logger?: Logger;
}

export interface XuanAgent {
  getConfigSummary(): Promise<ConfigSummary>;
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

/**
 * SDK 入口。V1 Milestone 1 只暴露配置能力；
 * analyzeBazi / askFollowup 等随后续里程碑加入（见 technical-design.md §18）。
 */
export function createXuanAgent(options: XuanAgentOptions = {}): XuanAgent {
  const config = mergeConfig(resolveConfig(), options.config);
  const logger = options.logger ?? createLogger(config.logLevel);

  logger.debug("XuanAgent 已创建", {
    provider: config.provider,
    model: config.model,
  });

  return {
    async getConfigSummary(): Promise<ConfigSummary> {
      return getConfigSummary(config);
    },
  };
}
