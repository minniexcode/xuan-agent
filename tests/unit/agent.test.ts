import { describe, expect, it } from "vitest";
import { type BaziCalculator, createXuanAgent, type LlmProvider } from "../../src/index.js";
import { createLogger } from "../../src/logging/index.js";

// Suppress log noise during tests.
const silent = createLogger("silent");

// The mock provider needs no API key and makes no network call, so the agent
// core can be exercised in isolation.
function makeAgent() {
  return createXuanAgent({ config: { provider: "mock" }, logger: silent });
}

// End-to-end agent behaviour with a mock provider: the full analyze pipeline
// (validate -> chart -> prompt -> LLM -> safety audit) must return a complete result.
describe("XuanAgent.analyzeBazi（mock Provider）", () => {
  // Pins the shape of AnalysisResult, including that the safety boundary notice is
  // applied and that no RAG is used when the query doesn't need citations.
  it("返回完整 AnalysisResult", async () => {
    const result = await makeAgent().analyzeBazi(
      {
        date: "1995-03-12",
        time: "08:30",
        gender: "male",
        calendar: "solar",
      },
      { temporary: true, mode: "beginner" },
    );

    expect(result.skill).toBe("bazi");
    expect(result.structured.pillars.year.ganZhi).toBe("乙亥");
    expect(result.content.summary).toContain("mock");
    expect(result.content.boundaryNotice).toContain("自我探索");
    expect(result.safety.boundaryApplied).toBe(true);
    expect(result.metadata.ragUsed).toBe(false);
    expect(result.citations).toEqual([]);
  });

  // FR-BAZI-01 rule 2: an ambiguous date must be rejected, never guessed.
  it("非法输入抛 VALIDATION_ERROR", async () => {
    await expect(
      makeAgent().analyzeBazi(
        {
          date: "03/04/1995",
          time: "08:30",
          gender: "male",
          calendar: "solar",
        },
        { temporary: true },
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  // R04: a Markdown answer with `## ` headings is parsed into structured sections
  // and follow-up questions; a plain answer would leave sections empty.
  it("结构化 sections 解析自 Markdown 标题", async () => {
    const markdownProvider: LlmProvider = {
      name: "mock",
      model: "mock",
      capabilities: {
        text: true,
        vision: false,
        streaming: false,
        structuredOutput: false,
        toolCalling: false,
      },
      invokeText: async () => ({
        text: "## 整体摘要\n这是一个测试解读。\n\n## 可继续追问\n- 问题一\n- 问题二",
      }),
    };
    const agent = createXuanAgent({
      config: { provider: "mock" },
      logger: silent,
      provider: markdownProvider,
    });
    const result = await agent.analyzeBazi(
      { date: "1995-03-12", time: "08:30", gender: "male", calendar: "solar" },
      { temporary: true },
    );
    expect(result.content.sections).toEqual([{ title: "整体摘要", body: "这是一个测试解读。" }]);
    expect(result.content.followupQuestions).toEqual(["问题一", "问题二"]);
  });

  // R09: a calculator failure is a CALCULATION_ERROR, not a native Error, and stops
  // the pipeline before the LLM is invoked.
  it("排盘故障抛 CALCULATION_ERROR", async () => {
    const failingCalculator: BaziCalculator = {
      source: { library: "test", version: "0" },
      calculate() {
        throw new Error("boom");
      },
    };
    const agent = createXuanAgent({
      config: { provider: "mock" },
      logger: silent,
      calculator: failingCalculator,
    });
    await expect(
      agent.analyzeBazi(
        { date: "1995-03-12", time: "08:30", gender: "male", calendar: "solar" },
        { temporary: true },
      ),
    ).rejects.toMatchObject({ code: "CALCULATION_ERROR" });
  });
});
