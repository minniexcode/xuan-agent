import type { ProviderName } from "../schemas/index.js";

/**
 * What a provider adapter can do. Read by the provider catalog and diagnostics
 * without instantiating the adapter (technical-design.md §22.1).
 */
export interface ProviderCapabilities {
  /** Text completion — the only capability V1 actually exercises. */
  text: boolean;
  /**
   * Always false in V1. This is the reserved hook for V2 相术 (physiognomy), which
   * will feed face/palm images to a vision-capable model; no adapter sets it true yet.
   */
  vision: boolean;
  streaming: boolean;
  structuredOutput: boolean;
  toolCalling: boolean;
}

/** One chat message in a text completion request. */
export interface TextLlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Input to a single text-completion call; `system` is prepended as a system message. */
export interface TextLlmInput {
  system?: string;
  messages: TextLlmMessage[];
  maxTokens?: number;
  temperature?: number;
}

/** The model's reply — text only in V1. */
export interface LlmTextOutput {
  text: string;
}

/**
 * The provider abstraction every business layer codes against. Business layers
 * never touch a concrete adapter directly (ADR-0006, FR-LLM-02).
 *
 * `invokeText` is the only invocation method — there is no `invokeVision` yet;
 * that arrives with V2 相术.
 */
export interface LlmProvider {
  name: ProviderName;
  model: string;
  capabilities: ProviderCapabilities;
  invokeText(input: TextLlmInput): Promise<LlmTextOutput>;
}
