import { describe, expect, it } from "vitest";
import { resolveConfig } from "../../src/config/index.js";
import { ProviderFactory } from "../../src/providers/index.js";

describe("ProviderFactory", () => {
  it("mock 无需 API key", () => {
    const provider = ProviderFactory.create(resolveConfig({ XUAN_PROVIDER: "mock" }));
    expect(provider.name).toBe("mock");
  });

  it("openai-compatible 缺 key 抛 PROVIDER_CONFIG_ERROR", () => {
    expect(() =>
      ProviderFactory.create(resolveConfig({ XUAN_PROVIDER: "openai-compatible" })),
    ).toThrowError(/XUAN_API_KEY/);
  });

  it("anthropic 抛 PROVIDER_CAPABILITY_ERROR（V1 骨架）", () => {
    expect(() =>
      ProviderFactory.create(resolveConfig({ XUAN_PROVIDER: "anthropic", XUAN_API_KEY: "sk-xxx" })),
    ).toThrowError(/尚未实现/);
  });
});
