import { XuanError } from "../errors/index.js";
import { isLogLevel, type LogLevel } from "../logging/index.js";
import { type ProviderName, ProviderNameSchema } from "../schemas/index.js";
import { resolvePaths, type XuanPaths } from "../storage/paths.js";
import { DEFAULTS } from "./defaults.js";

export interface XuanConfig {
  provider: ProviderName;
  model: string;
  apiKey?: string;
  baseUrl: string;
  temperature: number;
  maxTokens: number;
  enableVision: boolean;
  enableStreaming: boolean;
  logLevel: LogLevel;
  paths: XuanPaths;
}

/** 脱敏配置摘要：只报告 key 是否存在，绝不返回值。 */
export interface ConfigSummary {
  provider: {
    name: ProviderName;
    model: string;
    baseUrl: string;
    apiKeyPresent: boolean;
  };
  temperature: number;
  vision: boolean;
  streaming: boolean;
  logLevel: LogLevel;
  paths: XuanPaths;
  node: string;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === "") return fallback;
  return /^(1|true|yes|on)$/i.test(value.trim());
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

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
  if (apiKey !== undefined && apiKey !== "") config.apiKey = apiKey;
  return config;
}

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

export interface ConfigDoctorReport {
  ok: boolean;
  summary: ConfigSummary;
  warnings: string[];
  errors: string[];
}

/**
 * 配置健康检查。缺 API key 只算警告（本地命令仍可用），
 * 因此默认情况下退出码为 0，便于脚本与 smoke test 使用。
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
