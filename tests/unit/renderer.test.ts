import { describe, expect, it } from "vitest";
import { Tyme4tsBaziCalculator } from "../../src/calculators/index.js";
import { renderAnalysisResult } from "../../src/cli/renderers/bazi-renderer.js";
import { type AnalysisResult, BOUNDARY_NOTICE } from "../../src/schemas/analysis.js";
import { BirthInputSchema } from "../../src/schemas/index.js";

const chart = new Tyme4tsBaziCalculator().calculate(
  BirthInputSchema.parse({ date: "1995-03-12", time: "08:30", gender: "male", calendar: "solar" }),
);

/** Build a minimal result whose content fields the test can vary. */
function makeResult(content: Partial<AnalysisResult["content"]>): AnalysisResult<typeof chart> {
  return {
    id: "id",
    sessionId: "sess-1",
    skill: "bazi",
    provider: { name: "mock", model: "mock" },
    mode: "advanced",
    structured: chart,
    content: {
      summary: "",
      sections: [],
      followupQuestions: [],
      boundaryNotice: BOUNDARY_NOTICE,
      ...content,
    },
    citations: [],
    safety: { boundaryApplied: true, warnings: [], blocked: false },
    metadata: { createdAt: new Date().toISOString(), ragUsed: false },
  };
}

// CLI text rendering (technical-design.md §19.2): summary and sections render
// independently, so a leading summary is never hidden behind the sections.
describe("renderAnalysisResult", () => {
  it("同时渲染开头摘要与后续 section", () => {
    const text = renderAnalysisResult(
      makeResult({
        summary: "这是一段开头摘要。",
        sections: [{ title: "五行分布", body: "五行正文。" }],
      }),
    );
    expect(text).toContain("这是一段开头摘要。");
    expect(text).toContain("### 五行分布");
    expect(text).toContain("五行正文。");
  });

  it("无 sections 时渲染 summary", () => {
    const text = renderAnalysisResult(makeResult({ summary: "只有摘要。" }));
    expect(text).toContain("只有摘要。");
  });

  it("两者皆空时显示占位", () => {
    const text = renderAnalysisResult(makeResult({}));
    expect(text).toContain("（空）");
  });
});
