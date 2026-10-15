import { describe, expect, it } from "vitest";
import { createXuanAgent } from "../../src/index.js";
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
});
