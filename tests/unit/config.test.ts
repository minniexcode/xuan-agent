import { describe, expect, it } from "vitest";
import { diagnoseConfig, resolveConfig } from "../../src/config/index.js";
import { REDACTED, redactObject } from "../../src/logging/index.js";

describe("resolveConfig", () => {
  it("默认 Provider 为 openai-compatible（V1 单 Provider）", () => {
    expect(resolveConfig({}).provider).toBe("openai-compatible");
  });

  it("未知 Provider 抛 PROVIDER_CONFIG_ERROR", () => {
    expect(() => resolveConfig({ XUAN_PROVIDER: "nope" })).toThrowError(/未知的 Provider/);
  });

  it("布尔与数字字段容错", () => {
    const config = resolveConfig({ XUAN_ENABLE_VISION: "true", XUAN_TEMPERATURE: "0.9" });
    expect(config.enableVision).toBe(true);
    expect(config.temperature).toBe(0.9);
  });
});

describe("diagnoseConfig", () => {
  it("绝不泄露 API key，只报告存在性", () => {
    const report = diagnoseConfig(resolveConfig({ XUAN_API_KEY: "sk-secret-value" }));
    expect(JSON.stringify(report)).not.toContain("sk-secret-value");
    expect(report.summary.provider.apiKeyPresent).toBe(true);
  });

  it("缺 API key 只是警告，ok 仍为 true", () => {
    const report = diagnoseConfig(resolveConfig({}));
    expect(report.ok).toBe(true);
    expect(report.warnings.length).toBeGreaterThan(0);
  });
});

describe("redactObject", () => {
  it("替换敏感字段，保留普通字段", () => {
    const redacted = redactObject({ apiKey: "sk-abc", model: "deepseek-chat" });
    expect(redacted.apiKey).toBe(REDACTED);
    expect(redacted.model).toBe("deepseek-chat");
  });

  it("递归处理嵌套对象与数组", () => {
    const redacted = redactObject({ provider: { apiKey: "sk-abc" }, list: [{ token: "t" }] });
    expect(redacted.provider.apiKey).toBe(REDACTED);
    expect(redacted.list[0]?.token).toBe(REDACTED);
  });
});
