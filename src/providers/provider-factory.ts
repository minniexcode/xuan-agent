import type { XuanConfig } from "../config/index.js";
import { XuanError } from "../errors/index.js";
import { MockProvider } from "./mock.adapter.js";
import { OpenAiCompatibleProvider } from "./openai-compatible.adapter.js";
import type { LlmProvider } from "./provider.types.js";

/** 统一创建 LLM Provider，业务层不直接接触具体 adapter（ADR-0006）。 */
export const ProviderFactory = {
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
