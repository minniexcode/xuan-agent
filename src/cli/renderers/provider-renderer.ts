import type { ProviderInfo, ProviderStatus } from "../../providers/provider-catalog.js";

const STATUS_LABEL: Record<ProviderStatus, string> = {
  ready: "可用",
  skeleton: "骨架",
  mock: "测试",
};

const onOff = (value: boolean): string => (value ? "✓" : "—");

export function renderProviderList(providers: ProviderInfo[]): string {
  const lines = ["Provider 能力表", ""];
  for (const provider of providers) {
    const model = provider.defaultModel !== undefined ? `（默认 ${provider.defaultModel}）` : "";
    lines.push(`${provider.name} [${STATUS_LABEL[provider.status]}]${model}`);
    lines.push(
      `  text ${onOff(provider.capabilities.text)} · vision ${onOff(provider.capabilities.vision)} · ` +
        `streaming ${onOff(provider.capabilities.streaming)} · ` +
        `structuredOutput ${onOff(provider.capabilities.structuredOutput)} · ` +
        `toolCalling ${onOff(provider.capabilities.toolCalling)}`,
    );
  }
  return lines.join("\n");
}
