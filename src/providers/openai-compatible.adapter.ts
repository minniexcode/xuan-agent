import { randomUUID } from "node:crypto";
import { XuanError } from "../errors/index.js";
import type { ProviderName } from "../schemas/index.js";
import type {
  LlmProvider,
  LlmTextOutput,
  ProviderCapabilities,
  TextLlmInput,
} from "./provider.types.js";

/** Capabilities advertised by this adapter: text only in V1. */
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
  /** Stable per-conversation ID (opencode.ai requires it, for routing and caching). */
  sessionId?: string;
  temperature?: number;
  defaultMaxTokens?: number;
}

/**
 * OpenAI-compatible text provider. DeepSeek (via the opencode.ai gateway) runs through
 * this adapter (FR-LLM-02).
 *
 * Gotchas: opencode.ai requires the `x-opencode-session` header — without it the gateway
 * returns 400 `MissingSessionID`. The model may be a reasoning model, which emits its
 * thinking into `reasoning_content` and can consume the whole token budget; that is why
 * `max_tokens` is set generously and only `choices[0].message.content` is read as the answer.
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
    // Strip trailing slashes so `/chat/completions` never doubles up.
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.sessionId = options.sessionId ?? `xuan-${randomUUID()}`;
    this.temperature = options.temperature;
    // Config supplies 16000; this fallback (4096) only applies to direct construction.
    this.defaultMaxTokens = options.defaultMaxTokens ?? 4096;
  }

  /** Send the chat completion request; throws `XuanError` on network or non-2xx failure. */
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
          // Required by the opencode.ai gateway; missing it yields 400 `MissingSessionID`.
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
      // Stash status + the first 500 chars of the body so failures are debuggable
      // without dumping the whole (possibly huge) response.
      const body = await response.text().catch(() => "");
      throw new XuanError({
        code: "LLM_ERROR",
        message: `Provider 返回 ${response.status}`,
        stage: "llm",
        recoverable: true,
        details: { status: response.status, body: body.slice(0, 500) },
      });
    }

    let data: { choices?: { message?: { content?: string } }[] };
    try {
      data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    } catch (err) {
      // A 2xx body that is not JSON is a protocol failure, not a valid (empty) answer.
      throw XuanError.from(err, {
        code: "LLM_ERROR",
        message: "Provider 响应解析失败",
        stage: "llm",
        recoverable: true,
      });
    }
    // Read only the answer content — `reasoning_content` is deliberately ignored.
    const text = data.choices?.[0]?.message?.content ?? "";
    if (text.trim() === "") {
      throw new XuanError({
        code: "LLM_ERROR",
        message: "LLM 返回空回答",
        stage: "llm",
        recoverable: true,
      });
    }
    return { text };
  }
}
