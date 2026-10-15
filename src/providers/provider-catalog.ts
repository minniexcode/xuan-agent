import type { ProviderName } from "../schemas/index.js";
import type { ProviderCapabilities } from "./provider.types.js";

export type ProviderStatus = "ready" | "skeleton" | "mock";

export interface ProviderInfo {
  name: ProviderName;
  defaultModel?: string;
  capabilities: ProviderCapabilities;
  status: ProviderStatus;
}

const TEXT_ONLY: ProviderCapabilities = {
  text: true,
  vision: false,
  streaming: false,
  structuredOutput: false,
  toolCalling: false,
};

/** 已知 Provider 能力表（供 `xuan provider list` 与诊断使用）。 */
export function listProviders(): ProviderInfo[] {
  return [
    {
      name: "openai-compatible",
      defaultModel: "deepseek-chat",
      capabilities: TEXT_ONLY,
      status: "ready",
    },
    {
      name: "anthropic",
      capabilities: TEXT_ONLY,
      status: "skeleton",
    },
    {
      name: "mock",
      defaultModel: "mock",
      capabilities: TEXT_ONLY,
      status: "mock",
    },
  ];
}
