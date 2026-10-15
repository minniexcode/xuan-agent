import type { XuanConfig } from "../config/index.js";
import { XuanError } from "../errors/index.js";
import { MockProvider } from "./mock.adapter.js";
import { OpenAiCompatibleProvider } from "./openai-compatible.adapter.js";
import type { LlmProvider } from "./provider.types.js";

/**
 * Create the LLM provider for the configured backend. Business layers never touch
 * a concrete adapter directly (ADR-0006, FR-LLM-02).
 */
export const ProviderFactory = {
  /** Build a provider from `XuanConfig`; throws `XuanError` on missing or invalid config. */
  create(config: XuanConfig): LlmProvider {
    switch (config.provider) {
      case "mock":
        return new MockProvider();
      case "openai-compatible": {
        if (!config.apiKey) {
          throw new XuanError({
            code: "PROVIDER_CONFIG_ERROR",
            message: "未配置 XUAN_API_KEY",
            stage: "config",
            recoverable: true,
          });
        }
        return new OpenAiCompatibleProvider({
          baseUrl: config.baseUrl,
          apiKey: config.apiKey,
          model: config.model,
          temperature: config.temperature,
          defaultMaxTokens: config.maxTokens,
        });
      }
      // The anthropic adapter is a V1 skeleton: throw on purpose rather than silently
      // degrading to something that looks like a working provider.
      case "anthropic":
        throw new XuanError({
          code: "PROVIDER_CAPABILITY_ERROR",
          message: "anthropic adapter 尚未实现（V1 骨架）",
          stage: "config",
          recoverable: true,
        });
    }
  },
};
