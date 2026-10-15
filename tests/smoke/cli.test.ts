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
});
