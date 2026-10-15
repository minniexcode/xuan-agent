import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ChildLimit, Gender, LunarHour, SolarTime } from "tyme4ts";
import { describe, expect, it } from "vitest";

/**
 * 回归基线：防回归，不用于证明正确性。
 * 正确性已由三实现交叉对拍 + 权威节气时刻核对确认（见 docs/product-architecture.md §11）。
 *
 * 注意：M2 引入 `BaziCalculator` 后，本测试应改为经该接口断言，
 * 不再直接依赖 tyme4ts 原始对象。
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

const here = dirname(fileURLToPath(import.meta.url));
const baseline = JSON.parse(readFileSync(join(here, "bazi-baseline.json"), "utf8")) as Baseline;

function compute(testCase: BaselineCase): BaselineExpect {
  const [hours, minutes] = testCase.input.time.split(":").map(Number) as [number, number];

  let solarTime: SolarTime;
  if (testCase.input.calendar === "solar") {
    const [y, m, d] = (testCase.input.date ?? "").split("-").map(Number) as [
      number,
      number,
      number,
    ];
    solarTime = SolarTime.fromYmdHms(y, m, d, hours, minutes, 0);
  } else {
    const [y, m, d] = testCase.input.lunar as [number, number, number];
    solarTime = LunarHour.fromYmdHms(y, m, d, hours, minutes, 0).getSolarTime();
  }

  const eightChar = solarTime.getLunarHour().getEightChar();
  const gender = testCase.input.gender === "male" ? Gender.MAN : Gender.WOMAN;
  const childLimit = ChildLimit.fromSolarTime(solarTime, gender);

  const daYun: string[] = [];
  let fortune = childLimit.getStartDecadeFortune();
  for (let i = 0; i < 3 && fortune; i += 1) {
    daYun.push(`${fortune.getSixtyCycle().toString()}(${fortune.getStartAge()})`);
    fortune = fortune.next(1);
  }

  return {
    solar: solarTime.getSolarDay().toString(),
    year: eightChar.getYear().toString(),
    month: eightChar.getMonth().toString(),
    day: eightChar.getDay().toString(),
    hour: eightChar.getHour().toString(),
    dayMaster: eightChar.getDay().getHeavenStem().toString(),
    forward: childLimit.isForward(),
    daYun,
  };
}

describe("八字排盘回归基线", () => {
  it("基线文件结构完整", () => {
    expect(baseline.cases).toHaveLength(21);
    for (const testCase of baseline.cases) {
      expect(testCase.expect.year, `用例 ${testCase.id} 的年柱`).toMatch(/^[一-龥]{2}$/);
      expect(testCase.expect.dayMaster, `用例 ${testCase.id} 的日主`).toHaveLength(1);
    }
  });

  it("覆盖节气边界、晚子时、闰月与大运顺逆", () => {
    const covers = baseline.cases.map((c) => c.covers).join("|");
    for (const keyword of ["节气", "晚子时", "闰月", "大运顺", "大运逆"]) {
      expect(covers, `基线应覆盖「${keyword}」`).toContain(keyword);
    }
  });

  it("全部用例与 tyme4ts 当前输出一致（防回归）", () => {
    const mismatches = baseline.cases
      .map((testCase) => ({
        id: testCase.id,
        actual: compute(testCase),
        expected: testCase.expect,
      }))
      .filter(({ actual, expected }) => JSON.stringify(actual) !== JSON.stringify(expected));

    expect(mismatches).toEqual([]);
  });
});
