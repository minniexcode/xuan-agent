import { describe, expect, it } from "vitest";
import { Tyme4tsBaziCalculator } from "../../src/calculators/index.js";
import { PromptManager } from "../../src/prompts/index.js";
import { BirthInputSchema } from "../../src/schemas/index.js";

const chart = new Tyme4tsBaziCalculator().calculate(
  BirthInputSchema.parse({ date: "1995-03-12", time: "08:30", gender: "male", calendar: "solar" }),
);
const promptManager = new PromptManager();

describe("PromptManager", () => {
  it("system 含安全边界，user 含结构化盘面", () => {
    const rendered = promptManager.buildBaziPrompt(chart, "advanced");
    expect(rendered.input.system).toContain("中性");
    expect(rendered.input.system).toContain("非断言");
    expect(rendered.input.messages[0]?.content).toContain('"year"');
  });

  it("beginner / advanced 指令不同", () => {
    const beginner = promptManager.buildBaziPrompt(chart, "beginner");
    const advanced = promptManager.buildBaziPrompt(chart, "advanced");
    expect(beginner.input.messages[0]?.content).toContain("少术语");
    expect(advanced.input.messages[0]?.content).toContain("专业术语");
    expect(beginner.version).toBe("bazi-beginner-v0");
  });
});
