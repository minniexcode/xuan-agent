import type { ProviderName } from "../schemas/index.js";

export interface ProviderCapabilities {
  text: boolean;
  vision: boolean;
  streaming: boolean;
  structuredOutput: boolean;
  toolCalling: boolean;
}

export interface TextLlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface TextLlmInput {
  system?: string;
  messages: TextLlmMessage[];
  maxTokens?: number;
  temperature?: number;
}

export interface LlmTextOutput {
  text: string;
}

export interface LlmProvider {
  name: ProviderName;
  model: string;
  capabilities: ProviderCapabilities;
  invokeText(input: TextLlmInput): Promise<LlmTextOutput>;
}
