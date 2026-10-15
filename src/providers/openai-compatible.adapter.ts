import { randomUUID } from "node:crypto";
import { XuanError } from "../errors/index.js";
import type { ProviderName } from "../schemas/index.js";
import type {
  LlmProvider,
  LlmTextOutput,
  ProviderCapabilities,
  TextLlmInput,
} from "./provider.types.js";

const CAPABILITIES: ProviderCapabilities = {
  text: true,
  vision: false,
  streaming: false,
  structuredOutput: false,
  toolCalling: false,
};

export interface OpenAiCompatibleOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  /** 每次会话的稳定 ID（opencode.ai 需要，用于路由与缓存）。 */
  sessionId?: string;
  temperature?: number;
  defaultMaxTokens?: number;
}

/**
 * OpenAI 兼容的文本 Provider。DeepSeek（经 opencode.ai gateway）走此 adapter。
 * 注意：opencode.ai 要求 `x-opencode-session` 头；模型可能是推理模型（有 reasoning_content），
 * 因此默认 max_tokens 给足，最终答案取 `choices[0].message.content`。
 */
export class OpenAiCompatibleProvider implements LlmProvider {
  readonly name: ProviderName = "openai-compatible";
  readonly capabilities = CAPABILITIES;
  readonly model: string;

  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly sessionId: string;
  private readonly temperature?: number;
  private readonly defaultMaxTokens: number;

  constructor(options: OpenAiCompatibleOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.sessionId = options.sessionId ?? `xuan-${randomUUID()}`;
    this.temperature = options.temperature;
    this.defaultMaxTokens = options.defaultMaxTokens ?? 4096;
  }

  async invokeText(input: TextLlmInput): Promise<LlmTextOutput> {
    const messages = [
      ...(input.system !== undefined ? [{ role: "system" as const, content: input.system }] : []),
      ...input.messages,
    ];

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          "x-opencode-session": this.sessionId,
          "User-Agent": "xuan-agent/0.1.0",
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          max_tokens: input.maxTokens ?? this.defaultMaxTokens,
          ...(this.temperature !== undefined ? { temperature: this.temperature } : {}),
        }),
      });
    } catch (err) {
      throw XuanError.from(err, {
        code: "LLM_ERROR",
        message: "调用 LLM 失败（网络错误）",
        stage: "llm",
        recoverable: true,
      });
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new XuanError({
        code: "LLM_ERROR",
        message: `Provider 返回 ${response.status}`,
        stage: "llm",
        recoverable: true,
        details: { status: response.status, body: body.slice(0, 500) },
      });
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return { text: data.choices?.[0]?.message?.content ?? "" };
  }
}
