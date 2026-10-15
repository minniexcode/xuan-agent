import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { Tyme4tsBaziCalculator } from "../../src/calculators/index.js";
import { type BirthInput, BirthInputSchema } from "../../src/schemas/index.js";

/**
 * Regression baseline: guards against regressions, NOT proof of correctness.
 * Correctness was established by cross-checking three independent implementations
 * against authoritative solar-term times (see docs/product-architecture.md §11).
 * The assertions run through the `BaziCalculator` interface rather than calling
 * tyme4ts directly, so swapping the underlying library behind that interface
 * cannot silently change (or break) these expectations.
 */

interface BaselineExpect {
  solar: string;
  year: string;
  month: string;
  day: string;
  hour: string;
  dayMaster: string;
  forward: boolean;
  daYun: string[];
}

interface BaselineCase {
  id: number;
  input: {
    calendar: "solar" | "lunar";
    date?: string;
    lunar?: [number, number, number];
    time: string;
    gender: "male" | "female";
  };
  covers: string;
  expect: BaselineExpect;
}

interface Baseline {
  _meta: { library: string; libraryVersion: string; sect: string };
  cases: BaselineCase[];
}

// Load the frozen expectations from the data file next to this test (not code).
const here = dirname(fileURLToPath(import.meta.url));
const baseline = JSON.parse(readFileSync(join(here, "bazi-baseline.json"), "utf8")) as Baseline;

// Translate a raw baseline case into the schema-validated BirthInput the calculator
// expects. A negative lunar month encodes a leap month (e.g. -4 = leap 4th month).
function toBirthInput(testCase: BaselineCase): BirthInput {
  if (testCase.input.calendar === "lunar") {
    const [y, m, d] = testCase.input.lunar as [number, number, number];
    const date = `${y}-${String(Math.abs(m)).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    return BirthInputSchema.parse({
      date,
      calendar: "lunar",
      lunarLeapMonth: m < 0,
      gender: testCase.input.gender,
      time: testCase.input.time,
    });
  }
  return BirthInputSchema.parse({
    date: testCase.input.date,
    calendar: "solar",
    gender: testCase.input.gender,
    time: testCase.input.time,
  });
}

// Concrete implementation behind the BaziCalculator interface.
const calculator = new Tyme4tsBaziCalculator();

/**
 * Baseline regression suite for FR-BAZI-02 (deterministic chart calculation).
 * The 21 cases are designed to span the tricky boundaries: solar and lunar input,
 * leap month, solar-term boundaries, the late 子 hour, and both luck-pillar
 * directions (forward/reverse). Guards against silent changes to chart output.
 */
describe("八字排盘回归基线（经 BaziCalculator）", () => {
  // Sanity-check the fixture file itself before trusting it as a baseline.
  it("基线文件结构完整", () => {
    expect(baseline.cases).toHaveLength(21);
    for (const testCase of baseline.cases) {
      expect(testCase.expect.year, `用例 ${testCase.id} 的年柱`).toMatch(/^[一-龥]{2}$/);
      expect(testCase.expect.dayMaster, `用例 ${testCase.id} 的日主`).toHaveLength(1);
    }
  });

  // Pins the *coverage* of the baseline: if these hard boundaries are dropped from
  // the fixture, the regression guard would silently develop blind spots.
  it("覆盖节气边界、晚子时、闰月与大运顺逆", () => {
    const covers = baseline.cases.map((c) => c.covers).join("|");
    for (const keyword of ["节气", "晚子时", "闰月", "大运顺", "大运逆"]) {
      expect(covers, `基线应覆盖「${keyword}」`).toContain(keyword);
    }
  });

  // The actual guard: each case must reproduce the frozen expectation exactly.
  it("全部用例与基线一致（防回归）", () => {
    for (const testCase of baseline.cases) {
      const chart = calculator.calculate(toBirthInput(testCase));
      const actual = {
        year: chart.pillars.year.ganZhi,
        month: chart.pillars.month.ganZhi,
        day: chart.pillars.day.ganZhi,
        hour: chart.pillars.hour?.ganZhi,
        dayMaster: chart.dayMaster,
        forward: chart.luckForward,
        daYun: chart.luckPillars.slice(0, 3).map((luck) => `${luck.ganZhi}(${luck.startAge})`),
      };
      expect(actual, `用例 ${testCase.id}（${testCase.covers}）`).toEqual({
        year: testCase.expect.year,
        month: testCase.expect.month,
        day: testCase.expect.day,
        hour: testCase.expect.hour,
        dayMaster: testCase.expect.dayMaster,
        forward: testCase.expect.forward,
        daYun: testCase.expect.daYun,
      });
    }
  });
});
