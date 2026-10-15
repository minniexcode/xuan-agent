import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildProgram } from "../../src/cli/program.js";

function captureStdout(): () => string {
  const chunks: string[] = [];
  vi.spyOn(process.stdout, "write").mockImplementation((chunk: unknown) => {
    chunks.push(String(chunk));
    return true;
  });
  return () => chunks.join("");
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("CLI 冒烟", () => {
  it("`xuan config doctor --json` 输出纯 JSON", async () => {
    const readOutput = captureStdout();
    const program = buildProgram();
    program.exitOverride();

    await program.parseAsync(["node", "xuan", "config", "doctor", "--json"]);

    const parsed = JSON.parse(readOutput());
    expect(parsed.summary.provider.name).toBe("openai-compatible");
    expect(parsed.summary.provider).toHaveProperty("apiKeyPresent");
    expect(parsed).toHaveProperty("warnings");
  });

  it("`xuan config doctor` 文本输出不含 API key 内容", async () => {
    vi.stubEnv("XUAN_API_KEY", "sk-super-secret");
    const readOutput = captureStdout();
    const program = buildProgram();
    program.exitOverride();

    await program.parseAsync(["node", "xuan", "config", "doctor"]);

    const text = readOutput();
    expect(text).not.toContain("sk-super-secret");
    expect(text).toContain("API key");
  });

  it("`xuan provider list --json` 返回能力表", async () => {
    const readOutput = captureStdout();
    const program = buildProgram();
    program.exitOverride();

    await program.parseAsync(["node", "xuan", "provider", "list", "--json"]);

    const parsed = JSON.parse(readOutput());
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.some((p: { name: string }) => p.name === "openai-compatible")).toBe(true);
  });

  it("`xuan rag search --query 正印 --json` 返回带来源引用", async () => {
    const readOutput = captureStdout();
    const program = buildProgram();
    program.exitOverride();

    await program.parseAsync(["node", "xuan", "rag", "search", "--query", "正印", "--json"]);

    const parsed = JSON.parse(readOutput());
    expect(parsed.mode).toBe("keyword");
    expect(parsed.citations.length).toBeGreaterThan(0);
  });

  it("`xuan bazi analyze --json` 用 mock Provider 产出结构化结果", async () => {
    vi.stubEnv("XUAN_PROVIDER", "mock");
    vi.stubEnv("XUAN_DATA_DIR", mkdtempSync(join(tmpdir(), "xuan-smoke-")));
    const readOutput = captureStdout();
    const program = buildProgram();
    program.exitOverride();

    await program.parseAsync([
      "node",
      "xuan",
      "bazi",
      "analyze",
      "--date",
      "1995-03-12",
      "--time",
      "08:30",
      "--gender",
      "male",
      "--calendar",
      "solar",
      "--json",
    ]);

    const parsed = JSON.parse(readOutput());
    expect(parsed.structured.pillars.year.ganZhi).toBe("乙亥");
    expect(parsed.provider.name).toBe("mock");
  });
});
