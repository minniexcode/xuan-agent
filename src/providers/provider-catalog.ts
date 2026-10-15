import type { ProviderName } from "../schemas/index.js";
import type { ProviderCapabilities } from "./provider.types.js";

/** Lifecycle state of a provider: usable, stubbed, or a deterministic test double. */
export type ProviderStatus = "ready" | "skeleton" | "mock";

/** A provider's advertised capabilities, for `xuan provider list` and diagnostics. */
export interface ProviderInfo {
  name: ProviderName;
  defaultModel?: string;
  capabilities: ProviderCapabilities;
  status: ProviderStatus;
}

/** Baseline capability set for V1 adapters: text only, everything else off. */
const TEXT_ONLY: ProviderCapabilities = {
  text: true,
  vision: false,
  streaming: false,
  structuredOutput: false,
  toolCalling: false,
};

/**
 * Static table of known providers and their capabilities (used by `xuan provider list`
 * and diagnostics). Deliberately decoupled from ProviderFactory so that listing
 * capabilities never requires instantiating — or configuring — a provider.
 */
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
