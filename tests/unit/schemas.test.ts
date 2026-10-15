import { describe, expect, it } from "vitest";
import { BirthInputSchema } from "../../src/schemas/index.js";

const valid = {
  date: "1995-03-12",
  time: "08:30",
  gender: "male",
  calendar: "solar",
};

describe("BirthInputSchema（FR-BAZI-01）", () => {
  it("接受完整输入，并填入真太阳时默认值", () => {
    const parsed = BirthInputSchema.parse(valid);
    expect(parsed.date).toBe("1995-03-12");
    expect(parsed.useTrueSolarTime).toBe(false);
  });

  it("拒绝含糊日期——交交互层追问，不猜测", () => {
    expect(BirthInputSchema.safeParse({ ...valid, date: "03/04/1995" }).success).toBe(false);
    expect(BirthInputSchema.safeParse({ ...valid, date: "1995/03/12" }).success).toBe(false);
  });

  it("拒绝越界时间", () => {
    expect(BirthInputSchema.safeParse({ ...valid, time: "24:00" }).success).toBe(false);
    expect(BirthInputSchema.safeParse({ ...valid, time: "9:5" }).success).toBe(false);
  });

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

  it("性别必填", () => {
    const withoutGender: Record<string, unknown> = { ...valid };
    delete withoutGender.gender;
    expect(BirthInputSchema.safeParse(withoutGender).success).toBe(false);
  });

  it("历法类型必填", () => {
    const noCalendar: Record<string, unknown> = { ...valid };
    delete noCalendar.calendar;
    expect(BirthInputSchema.safeParse(noCalendar).success).toBe(false);
  });
});
