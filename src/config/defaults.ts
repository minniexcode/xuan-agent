import type { LogLevel } from "../logging/index.js";
import type { ProviderName } from "../schemas/index.js";

export interface XuanDefaults {
  provider: ProviderName;
  model: string;
  baseUrl: string;
  temperature: number;
  enableVision: boolean;
  enableStreaming: boolean;
  logLevel: LogLevel;
}

/** 包内默认值，配置优先级最低（technical-design.md §16.1）。 */
export const DEFAULTS: XuanDefaults = {
  provider: "openai-compatible",
  model: "deepseek-chat",
  baseUrl: "https://api.deepseek.com/v1",
  temperature: 0.4,
  enableVision: false,
  enableStreaming: true,
  logLevel: "info",
};
