import type { LogLevel } from "../logging/index.js";
import type { ProviderName } from "../schemas/index.js";

/** Shape of the built-in default configuration. */
export interface XuanDefaults {
  provider: ProviderName;
  model: string;
  baseUrl: string;
  temperature: number;
  /** A reasoning model's thinking consumes many tokens, so interpretation gets a generous default budget. */
  maxTokens: number;
  enableVision: boolean;
  enableStreaming: boolean;
  logLevel: LogLevel;
}

/** In-package defaults; lowest priority in config resolution (technical-design.md §16.1). */
export const DEFAULTS: XuanDefaults = {
  provider: "openai-compatible",
  model: "deepseek-chat",
  baseUrl: "https://api.deepseek.com/v1",
  temperature: 0.4,
  maxTokens: 16000,
  enableVision: false,
  enableStreaming: true,
  logLevel: "info",
};
