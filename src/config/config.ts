import { XuanError } from "../errors/index.js";
import { isLogLevel, type LogLevel } from "../logging/index.js";
import { type ProviderName, ProviderNameSchema } from "../schemas/index.js";
import { resolvePaths, type XuanPaths } from "../storage/paths.js";
import { DEFAULTS } from "./defaults.js";

/** Fully resolved runtime configuration (technical-design.md §16). */
export interface XuanConfig {
  provider: ProviderName;
  model: string;
  /** Provider API key; absent when unset (e.g. mock provider or local-only use). */
  apiKey?: string;
  baseUrl: string;
  temperature: number;
  maxTokens: number;
  enableVision: boolean;
  enableStreaming: boolean;
  logLevel: LogLevel;
  paths: XuanPaths;
}

/** Redacted config summary: reports only whether the key is present, never its value. */
export interface ConfigSummary {
  provider: {
    name: ProviderName;
    model: string;
    baseUrl: string;
    /** Presence flag only — the key value is never included. */
    apiKeyPresent: boolean;
  };
  temperature: number;
  vision: boolean;
  streaming: boolean;
  logLevel: LogLevel;
  paths: XuanPaths;
  /** Node.js runtime version. */
  node: string;
}

/** Parse a boolean-ish env string; empty/undefined falls back, otherwise truthy tokens win. */
function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === "") return fallback;
  return /^(1|true|yes|on)$/i.test(value.trim());
}

/** Parse a numeric env string; empty/undefined or non-finite values fall back. */
function parseNumber(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Resolve config from the environment (technical-design.md §16.1).
 * `env` is a parameter (defaulting to process.env) specifically so tests can inject a fake environment.
 */
export function resolveConfig(env: NodeJS.ProcessEnv = process.env): XuanConfig {
  const rawProvider = env.XUAN_PROVIDER?.trim() || DEFAULTS.provider;
  const parsedProvider = ProviderNameSchema.safeParse(rawProvider);
  if (!parsedProvider.success) {
    throw new XuanError({
      code: "PROVIDER_CONFIG_ERROR",
      message: `未知的 Provider：${rawProvider}`,
      stage: "config",
      recoverable: true,
      details: { supported: ProviderNameSchema.options },
    });
  }

  const rawLogLevel = env.XUAN_LOG_LEVEL?.trim() ?? DEFAULTS.logLevel;
  const config: XuanConfig = {
    provider: parsedProvider.data,
    model: env.XUAN_MODEL?.trim() || DEFAULTS.model,
    baseUrl: env.XUAN_BASE_URL?.trim() || DEFAULTS.baseUrl,
    temperature: parseNumber(env.XUAN_TEMPERATURE, DEFAULTS.temperature),
    maxTokens: parseNumber(env.XUAN_MAX_TOKENS, DEFAULTS.maxTokens),
    enableVision: parseBoolean(env.XUAN_ENABLE_VISION, DEFAULTS.enableVision),
    enableStreaming: parseBoolean(env.XUAN_ENABLE_STREAMING, DEFAULTS.enableStreaming),
    logLevel: isLogLevel(rawLogLevel) ? rawLogLevel : DEFAULTS.logLevel,
    paths: resolvePaths(env),
  };

  const apiKey = env.XUAN_API_KEY?.trim();
  // Only attach the key when it is genuinely set, so `apiKey` stays absent otherwise.
  if (apiKey !== undefined && apiKey !== "") config.apiKey = apiKey;
  return config;
}

/** Build the redacted summary; must never include the API key, only its presence. */
export function getConfigSummary(config: XuanConfig): ConfigSummary {
  return {
    provider: {
      name: config.provider,
      model: config.model,
      baseUrl: config.baseUrl,
      apiKeyPresent: Boolean(config.apiKey),
    },
    temperature: config.temperature,
    vision: config.enableVision,
    streaming: config.enableStreaming,
    logLevel: config.logLevel,
    paths: config.paths,
    node: process.version,
  };
}

/** Result of the config health check (xuan config doctor). */
export interface ConfigDoctorReport {
  ok: boolean;
  summary: ConfigSummary;
  warnings: string[];
  errors: string[];
}

/**
 * Config health check. A missing API key is only a warning (local commands still work),
 * so the default exit code stays 0 for scripts and smoke tests.
 */
export function diagnoseConfig(config: XuanConfig): ConfigDoctorReport {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (config.provider !== "mock" && !config.apiKey) {
    warnings.push("未配置 XUAN_API_KEY：本地命令可用，但调用 LLM 会返回 PROVIDER_CONFIG_ERROR");
  }
  if (config.enableVision) {
    warnings.push("XUAN_ENABLE_VISION=true，但 V1 不交付 Vision 能力（相术为 V2）");
  }
  if (config.paths.knowledgeDir === undefined) {
    warnings.push("未配置 XUAN_KNOWLEDGE_DIR：将使用包内 seed 知识库（内容待补）");
  }

  return {
    ok: errors.length === 0,
    summary: getConfigSummary(config),
    warnings,
    errors,
  };
}
