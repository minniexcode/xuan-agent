import { describe, expect, it } from "vitest";
import { BirthInputSchema } from "../../src/schemas/index.js";

// Shared valid input reused across the cases.
const valid = {
  date: "1995-03-12",
  time: "08:30",
  gender: "male",
  calendar: "solar",
};

// Birth-input validation for FR-BAZI-01: collect the minimum required info and
// reject ambiguous or malformed input rather than guessing.
describe("BirthInputSchema（FR-BAZI-01）", () => {
  it("接受完整输入，并填入真太阳时默认值", () => {
    const parsed = BirthInputSchema.parse(valid);
    expect(parsed.date).toBe("1995-03-12");
    expect(parsed.useTrueSolarTime).toBe(false);
  });

  // FR-BAZI-01 rule 2: only strict YYYY-MM-DD is accepted; ambiguous formats like
  // 03/04/1995 must be rejected so the interaction layer can ask for clarification.
  it("拒绝含糊日期——交交互层追问，不猜测", () => {
    expect(BirthInputSchema.safeParse({ ...valid, date: "03/04/1995" }).success).toBe(false);
    expect(BirthInputSchema.safeParse({ ...valid, date: "1995/03/12" }).success).toBe(false);
  });

  it("拒绝越界时间", () => {
    expect(BirthInputSchema.safeParse({ ...valid, time: "24:00" }).success).toBe(false);
    expect(BirthInputSchema.safeParse({ ...valid, time: "9:5" }).success).toBe(false);
  });

  // Either an exact time or an explicit "unknown" flag -- never both, never neither.
  it("time 与 timeUnknown 二选一", () => {
    expect(BirthInputSchema.safeParse({ ...valid, timeUnknown: true }).success).toBe(false);
    const noTime: Record<string, unknown> = { ...valid };
    delete noTime.time;
    noTime.timeUnknown = true;
    expect(BirthInputSchema.safeParse(noTime).success).toBe(true);
  });

  it("出生地可省略", () => {
    expect(BirthInputSchema.safeParse(valid).success).toBe(true);
  });

  // Gender is required (it drives luck-pillar direction).
  it("性别必填", () => {
    const withoutGender: Record<string, unknown> = { ...valid };
    delete withoutGender.gender;
    expect(BirthInputSchema.safeParse(withoutGender).success).toBe(false);
  });

  // The calendar type is required to know whether the date is solar or lunar.
  it("历法类型必填", () => {
    const noCalendar: Record<string, unknown> = { ...valid };
    delete noCalendar.calendar;
    expect(BirthInputSchema.safeParse(noCalendar).success).toBe(false);
  });

  // "both" was removed from OutputMode in the V1 scope narrowing.
  it("拒绝已移除的 both 模式", () => {
    expect(BirthInputSchema.safeParse({ ...valid, mode: "both" }).success).toBe(false);
  });

  // R07: a literal false must not smuggle a fabricated hour pillar past validation.
  it("timeUnknown:false 被拒（缺 time 时不伪造时柱）", () => {
    const noTime: Record<string, unknown> = { ...valid };
    delete noTime.time;
    noTime.timeUnknown = false;
    expect(BirthInputSchema.safeParse(noTime).success).toBe(false);
  });

  // R09: impossible solar dates are rejected before reaching the calculator.
  it("拒绝无效公历日期", () => {
    expect(BirthInputSchema.safeParse({ ...valid, date: "1995-02-30" }).success).toBe(false);
    expect(BirthInputSchema.safeParse({ ...valid, date: "1995-13-12" }).success).toBe(false);
  });
});
