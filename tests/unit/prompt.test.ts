import { describe, expect, it } from "vitest";
import { Tyme4tsBaziCalculator } from "../../src/calculators/index.js";
import { PromptManager } from "../../src/prompts/index.js";
import { BirthInputSchema } from "../../src/schemas/index.js";

// A real chart rendered by the calculator, so the prompt is built from genuine
// structured output rather than a hand-written stub.
const chart = new Tyme4tsBaziCalculator().calculate(
  BirthInputSchema.parse({ date: "1995-03-12", time: "08:30", gender: "male", calendar: "solar" }),
);
const promptManager = new PromptManager();

// Prompt construction (technical-design.md §25): the safety boundary lives in the
// system prompt and the structured chart is injected into the user message.
describe("PromptManager", () => {
  // The system prompt must carry the neutral/non-assertive safety framing, and the
  // user message must embed the structured chart (JSON keys) rather than prose.
  it("system 含安全边界，user 含结构化盘面", () => {
    const rendered = promptManager.buildBaziPrompt(chart, "advanced");
    expect(rendered.input.system).toContain("中性");
    expect(rendered.input.system).toContain("非断言");
    expect(rendered.input.messages[0]?.content).toContain('"year"');
  });

  // FR-BAZI-03/04: beginner mode suppresses jargon while advanced mode uses it; the
  // prompt version is mode-specific.
  it("beginner / advanced 指令不同", () => {
    const beginner = promptManager.buildBaziPrompt(chart, "beginner");
    const advanced = promptManager.buildBaziPrompt(chart, "advanced");
    expect(beginner.input.messages[0]?.content).toContain("少术语");
    expect(advanced.input.messages[0]?.content).toContain("专业术语");
    expect(beginner.version).toBe("bazi-beginner-v0");
  });
});
