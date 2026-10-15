import type { ProviderName } from "../schemas/index.js";
import type {
  LlmProvider,
  LlmTextOutput,
  ProviderCapabilities,
  TextLlmInput,
} from "./provider.types.js";

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

  async invokeText(_input: TextLlmInput): Promise<LlmTextOutput> {
    return { text: this.reply };
  }
}
