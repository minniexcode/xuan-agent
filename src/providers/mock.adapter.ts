import type { ProviderName } from "../schemas/index.js";
import type {
  LlmProvider,
  LlmTextOutput,
  ProviderCapabilities,
  TextLlmInput,
} from "./provider.types.js";

/**
 * Deterministic test double. Returns a fixed reply so tests and `xuan config doctor`
 * can exercise the provider path without a network or API key.
 */
export class MockProvider implements LlmProvider {
  readonly name: ProviderName = "mock";
  readonly model = "mock";
  readonly capabilities: ProviderCapabilities = {
    text: true,
    vision: false,
    streaming: false,
    structuredOutput: false,
    toolCalling: false,
  };

  constructor(private readonly reply = "（mock 解读）") {}

  /** Always returns the canned reply; `_input` is intentionally ignored. */
  async invokeText(_input: TextLlmInput): Promise<LlmTextOutput> {
    return { text: this.reply };
  }
}
