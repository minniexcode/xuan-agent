import { describe, expect, it } from "vitest";
import { parseSections } from "../../src/prompts/index.js";

// The section parser backs the Markdown-heading output contract (FR-BAZI-03/04):
// a `## ` line starts a section, text before the first heading is the summary, and
// a `可继续追问` section's bullets become follow-up questions.
describe("parseSections", () => {
  it("按 ## 标题切分 section", () => {
    const result = parseSections("intro\n\n## 整体摘要\n摘要正文\n\n## 五行分布\n五行正文");
    expect(result.summary).toBe("intro");
    expect(result.sections).toEqual([
      { title: "整体摘要", body: "摘要正文" },
      { title: "五行分布", body: "五行正文" },
    ]);
    expect(result.followupQuestions).toEqual([]);
  });

  it("提取可继续追问的问题", () => {
    const result = parseSections("## 整体摘要\n正文\n\n## 可继续追问\n- 问题一\n- 问题二");
    expect(result.sections.map((s) => s.title)).toEqual(["整体摘要"]);
    expect(result.followupQuestions).toEqual(["问题一", "问题二"]);
  });

  it("无标题时整段降级为 summary", () => {
    const result = parseSections("这是一段没有标题的普通文本。");
    expect(result.summary).toBe("这是一段没有标题的普通文本。");
    expect(result.sections).toEqual([]);
    expect(result.followupQuestions).toEqual([]);
  });

  // P2: only the agreed heading is a question list — a heading that merely contains
  // "追问" (e.g. "追问解答") must keep its body as a normal section.
  it("标题含「追问」但非约定标题时保留正文", () => {
    const result = parseSections("## 追问解答\n这是一段正常正文。");
    expect(result.sections).toEqual([{ title: "追问解答", body: "这是一段正常正文。" }]);
    expect(result.followupQuestions).toEqual([]);
  });

  // P2: a bullet-free body under the follow-up heading must not be dropped.
  it("可继续追问无列表项时保留正文", () => {
    const result = parseSections("## 可继续追问\n这是说明性文字，不是列表。");
    expect(result.sections).toEqual([{ title: "可继续追问", body: "这是说明性文字，不是列表。" }]);
    expect(result.followupQuestions).toEqual([]);
  });
});
