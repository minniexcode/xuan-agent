import { describe, expect, it } from "vitest";
import { SafetyGuard } from "../../src/safety/index.js";

const guard = new SafetyGuard();

describe("SafetyGuard 输出审计", () => {
  it("识别断言式表达", () => {
    expect(guard.auditOutput("你注定会发财").blocked).toBe(true);
    expect(guard.auditOutput("这是大凶之兆").blocked).toBe(true);
  });

  it("中性表达不触发", () => {
    const audit = guard.auditOutput("从结构看，这里更接近一种倾向，而非确定结果");
    expect(audit.blocked).toBe(false);
    expect(audit.warnings).toEqual([]);
  });

  it("warnings 去重", () => {
    const audit = guard.auditOutput("注定必然");
    expect(audit.warnings.length).toBe(1);
  });
});
