import { describe, expect, it } from "vitest";
import { SafetyGuard } from "../../src/safety/index.js";

const guard = new SafetyGuard();

// Output audit for the neutral-analysis safety boundary (product-architecture §8,
// ADR-0009): fortune/misfortune assertions and fatalistic labels must be blocked.
describe("SafetyGuard 输出审计", () => {
  // Assertive phrasing ("destined to get rich", "an omen of great misfortune")
  // is prohibited output and must be flagged.
  it("识别断言式表达", () => {
    expect(guard.auditOutput("你注定会发财").blocked).toBe(true);
    expect(guard.auditOutput("这是大凶之兆").blocked).toBe(true);
  });

  // The guard must not over-block: hedged, structural language is allowed through
  // with no warnings.
  it("中性表达不触发", () => {
    const audit = guard.auditOutput("从结构看，这里更接近一种倾向，而非确定结果");
    expect(audit.blocked).toBe(false);
    expect(audit.warnings).toEqual([]);
  });

  // Overlapping rules can match the same span; warnings must be de-duplicated.
  it("warnings 去重", () => {
    const audit = guard.auditOutput("注定必然");
    expect(audit.warnings.length).toBe(1);
  });
});
