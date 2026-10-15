import { describe, expect, it } from "vitest";
import { XUAN_ERROR_CODES, XuanError } from "../../src/errors/index.js";

// Structured error type (technical-design.md §17.6): programmatic failures carry a
// stable code/stage/recoverable shape so callers and the CLI can react to them.
describe("XuanError", () => {
  it("保留结构化形状", () => {
    const error = new XuanError({
      code: "CALCULATION_ERROR",
      message: "排盘失败",
      stage: "calculation",
      recoverable: false,
    });
    expect(error).toBeInstanceOf(Error);
    expect(error.toShape()).toEqual({
      code: "CALCULATION_ERROR",
      message: "排盘失败",
      stage: "calculation",
      recoverable: false,
    });
  });

  // Wrapping an unknown throwable must not lose the original message.
  it("from() 收敛未知异常并保留 cause", () => {
    const wrapped = XuanError.from(new Error("boom"), {
      code: "STORAGE_ERROR",
      message: "读写失败",
      stage: "storage",
      recoverable: true,
    });
    expect(wrapped.code).toBe("STORAGE_ERROR");
    expect(wrapped.details?.cause).toBe("boom");
  });

  // Idempotence: from() must not re-wrap an already-structured error.
  it("from() 对已是 XuanError 的原样返回", () => {
    const original = new XuanError({
      code: "SAFETY_BLOCKED",
      message: "触发安全边界",
      stage: "safety",
      recoverable: false,
    });
    expect(
      XuanError.from(original, {
        code: "LLM_ERROR",
        message: "x",
        stage: "llm",
        recoverable: true,
      }),
    ).toBe(original);
  });

  // Pins the public error-code set so adding/removing a code is a deliberate change.
  it("错误码集合稳定", () => {
    expect([...XUAN_ERROR_CODES]).toHaveLength(9);
    expect(XUAN_ERROR_CODES).toContain("PROVIDER_CAPABILITY_ERROR");
  });
});
