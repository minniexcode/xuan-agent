import { describe, expect, it } from "vitest";
import { resolveConfig } from "../../src/config/index.js";
import { ProviderFactory } from "../../src/providers/index.js";

// Provider construction for FR-LLM-02: the factory reads config, validates the
// required credentials/capabilities, and returns the right adapter.
describe("ProviderFactory", () => {
  // The mock provider is for tests/local runs and must not demand a key.
  it("mock 无需 API key", () => {
    const provider = ProviderFactory.create(resolveConfig({ XUAN_PROVIDER: "mock" }));
    expect(provider.name).toBe("mock");
  });

  // FR-LLM-01 rule 3: a missing key is a hard configuration error, not a warning.
  it("openai-compatible 缺 key 抛 PROVIDER_CONFIG_ERROR", () => {
    expect(() =>
      ProviderFactory.create(resolveConfig({ XUAN_PROVIDER: "openai-compatible" })),
    ).toThrowError(/XUAN_API_KEY/);
  });

  // The Anthropic adapter is a V1 skeleton only, so selecting it must fail clearly
  // rather than silently fall back (FR-LLM-02).
  it("anthropic 抛 PROVIDER_CAPABILITY_ERROR（V1 骨架）", () => {
    expect(() =>
      ProviderFactory.create(resolveConfig({ XUAN_PROVIDER: "anthropic", XUAN_API_KEY: "sk-xxx" })),
    ).toThrowError(/尚未实现/);
  });
});
