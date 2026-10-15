import { describe, expect, it } from "vitest";
import { Tyme4tsBaziCalculator } from "../../src/calculators/index.js";
import { BirthInputSchema } from "../../src/schemas/index.js";

const calculator = new Tyme4tsBaziCalculator();
const base = BirthInputSchema.parse({
  date: "1995-03-12",
  time: "08:30",
  gender: "male",
  calendar: "solar",
});

describe("Tyme4tsBaziCalculator", () => {
  it("排盘四柱与日主", () => {
    const chart = calculator.calculate(base);
    expect(chart.pillars.year.ganZhi).toBe("乙亥");
    expect(chart.pillars.month.ganZhi).toBe("己卯");
    expect(chart.pillars.day.ganZhi).toBe("壬寅");
    expect(chart.pillars.hour?.ganZhi).toBe("甲辰");
    expect(chart.dayMaster).toBe("壬");
  });

  it("藏干与纳音", () => {
    const chart = calculator.calculate(base);
    expect(chart.pillars.day.hiddenStems).toEqual(["甲", "丙", "戊"]);
    expect(chart.pillars.year.naYin).toBe("山头火");
  });

  it("十神基于日主", () => {
    const chart = calculator.calculate(base);
    const tenGods = Object.fromEntries(chart.tenGods.map((t) => [t.pillar, t.tenGod]));
    expect(tenGods.year).toBe("伤官");
    expect(tenGods.month).toBe("正官");
    expect(tenGods.day).toBe("比肩");
    expect(tenGods.hour).toBe("食神");
  });

  it("时辰未知时不生成时柱并标注限制", () => {
    const chart = calculator.calculate(
      BirthInputSchema.parse({
        date: "1995-03-12",
        timeUnknown: true,
        gender: "male",
        calendar: "solar",
      }),
    );
    expect(chart.pillars.hour).toBeUndefined();
    expect(chart.pillars.hourStatus).toBe("unknown");
    expect(chart.limitations.some((l) => l.includes("时辰未知"))).toBe(true);
  });

  it("性别未提供时不排大运", () => {
    const chart = calculator.calculate(
      BirthInputSchema.parse({
        date: "1995-03-12",
        time: "08:30",
        gender: "unspecified",
        calendar: "solar",
      }),
    );
    expect(chart.luckPillars).toEqual([]);
    expect(chart.limitations.some((l) => l.includes("性别未提供"))).toBe(true);
  });

  it("晚子时标注流派", () => {
    const chart = calculator.calculate(
      BirthInputSchema.parse({
        date: "1990-06-15",
        time: "23:30",
        gender: "male",
        calendar: "solar",
      }),
    );
    expect(chart.limitations.some((l) => l.includes("晚子时"))).toBe(true);
  });
});
