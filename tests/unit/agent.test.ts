import { describe, expect, it } from "vitest";
import { createXuanAgent } from "../../src/index.js";
import { createLogger } from "../../src/logging/index.js";

const silent = createLogger("silent");

function makeAgent() {
  return createXuanAgent({ config: { provider: "mock" }, logger: silent });
}

describe("XuanAgent.analyzeBazi（mock Provider）", () => {
  it("返回完整 AnalysisResult", async () => {
    const result = await makeAgent().analyzeBazi({
      date: "1995-03-12",
      time: "08:30",
      gender: "male",
      calendar: "solar",
    });

    expect(result.skill).toBe("bazi");
    expect(result.structured.pillars.year.ganZhi).toBe("乙亥");
    expect(result.content.summary).toContain("mock");
    expect(result.content.boundaryNotice).toContain("自我探索");
    expect(result.safety.boundaryApplied).toBe(true);
    expect(result.metadata.ragUsed).toBe(false);
  });

  it("非法输入抛 VALIDATION_ERROR", async () => {
    await expect(
      makeAgent().analyzeBazi({
        date: "03/04/1995",
        time: "08:30",
        gender: "male",
        calendar: "solar",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});
