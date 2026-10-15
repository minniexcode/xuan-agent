import { describe, expect, it } from "vitest";
import { createXuanAgent } from "../../src/index.js";
import { createLogger } from "../../src/logging/index.js";

// Suppress log noise so smoke-test output stays readable.
const silent = createLogger("silent");

// SDK smoke test (technical-design.md §27.4): the documented public entry point must
// construct an agent and expose a config summary using the mock provider (no API key).
describe("SDK 冒烟", () => {
  it("createXuanAgent + getConfigSummary 可用", async () => {
    const agent = createXuanAgent({ config: { provider: "mock" }, logger: silent });
    const summary = await agent.getConfigSummary();

    expect(summary.provider.name).toBe("mock");
    expect(summary.provider).toHaveProperty("apiKeyPresent");
    expect(summary.paths.dataDir).toBeTruthy();
  });
});
