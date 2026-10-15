import {
  ChildLimit,
  type EarthBranch,
  Gender,
  type HeavenStem,
  LunarHour,
  type SixtyCycle,
  SolarTime,
} from "tyme4ts";
import type {
  BaziChart,
  FiveElementName,
  LuckPillar,
  Pillar,
  TenGodRelation,
} from "../schemas/bazi.js";
import type { BirthInput } from "../schemas/index.js";
import type { BaziCalculator } from "./bazi-calculator.js";

const LIBRARY = "tyme4ts";
const VERSION = "1.5.3";
const LUCK_STEPS = 8;

function toPillar(cycle: SixtyCycle): Pillar {
  const stem = cycle.getHeavenStem();
  const branch = cycle.getEarthBranch();
  return {
    ganZhi: cycle.toString(),
    heavenlyStem: stem.toString(),
    earthlyBranch: branch.toString(),
    hiddenStems: branch.getHideHeavenStems().map((hidden) => hidden.getHeavenStem().toString()),
    naYin: cycle.getSound().toString(),
  };
}

function resolveSolarTime(input: BirthInput): { solarTime: SolarTime; hourKnown: boolean } {
  const [year, month, day] = input.date.split("-").map(Number) as [number, number, number];
  const [hour, minute] = (input.time ?? "12:00").split(":").map(Number) as [number, number];

  // 闰月用负月份表示（-4 = 闰四月），仅农历生效。
  const lunarMonth = input.calendar === "lunar" && input.lunarLeapMonth ? -Math.abs(month) : month;
  const hourKnown = !input.timeUnknown;

  const solarTime =
    input.calendar === "lunar"
      ? LunarHour.fromYmdHms(year, lunarMonth, day, hour, minute, 0).getSolarTime()
      : SolarTime.fromYmdHms(year, month, day, hour, minute, 0);

  return { solarTime, hourKnown };
}

function countFiveElements(
  stems: HeavenStem[],
  branches: EarthBranch[],
): Record<FiveElementName, number> {
  const counts: Record<FiveElementName, number> = { 金: 0, 木: 0, 水: 0, 火: 0, 土: 0 };
  for (const stem of stems) counts[stem.getElement().toString() as FiveElementName] += 1;
  for (const branch of branches) counts[branch.getElement().toString() as FiveElementName] += 1;
  return counts;
}

export class Tyme4tsBaziCalculator implements BaziCalculator {
  readonly source = { library: LIBRARY, version: VERSION };

  calculate(input: BirthInput): BaziChart {
    const { solarTime, hourKnown } = resolveSolarTime(input);
    const eightChar = solarTime.getLunarHour().getEightChar();

    const yearPillar = toPillar(eightChar.getYear());
    const monthPillar = toPillar(eightChar.getMonth());
    const dayPillar = toPillar(eightChar.getDay());
    const hourPillar = hourKnown ? toPillar(eightChar.getHour()) : undefined;

    const dayStem = eightChar.getDay().getHeavenStem();
    const tenGods: TenGodRelation[] = [
      {
        pillar: "year",
        tenGod: dayStem.getTenStar(eightChar.getYear().getHeavenStem()).toString(),
      },
      {
        pillar: "month",
        tenGod: dayStem.getTenStar(eightChar.getMonth().getHeavenStem()).toString(),
      },
      { pillar: "day", tenGod: dayStem.getTenStar(eightChar.getDay().getHeavenStem()).toString() },
    ];
    if (hourPillar) {
      tenGods.push({
        pillar: "hour",
        tenGod: dayStem.getTenStar(eightChar.getHour().getHeavenStem()).toString(),
      });
    }

    const stems = [eightChar.getYear(), eightChar.getMonth(), eightChar.getDay()].map((cycle) =>
      cycle.getHeavenStem(),
    );
    if (hourKnown) stems.push(eightChar.getHour().getHeavenStem());

    const branches = [eightChar.getYear(), eightChar.getMonth(), eightChar.getDay()].map((cycle) =>
      cycle.getEarthBranch(),
    );
    if (hourKnown) branches.push(eightChar.getHour().getEarthBranch());

    const limitations: string[] = [];
    if (!hourKnown) limitations.push("时辰未知：时柱缺失，精度受限");
    if (input.time?.startsWith("23:")) {
      limitations.push("晚子时（23:00–23:59）：日柱按次日计算（School B，可切换）");
    }
    limitations.push("未启用真太阳时");

    let luckForward = false;
    let luckStartAge = 0;
    const luckPillars: LuckPillar[] = [];
    if (input.gender !== "unspecified") {
      const gender = input.gender === "male" ? Gender.MAN : Gender.WOMAN;
      const childLimit = ChildLimit.fromSolarTime(solarTime, gender);
      luckForward = childLimit.isForward();
      luckStartAge = childLimit.getStartAge();
      let fortune = childLimit.getStartDecadeFortune();
      for (let i = 0; i < LUCK_STEPS && fortune; i += 1) {
        luckPillars.push({
          index: i,
          ganZhi: fortune.getSixtyCycle().toString(),
          startAge: fortune.getStartAge(),
          endAge: fortune.getEndAge(),
        });
        fortune = fortune.next(1);
      }
    } else {
      limitations.push("性别未提供：大运未排");
    }

    return {
      source: { library: LIBRARY, version: VERSION, generatedAt: new Date().toISOString() },
      input,
      pillars: {
        year: yearPillar,
        month: monthPillar,
        day: dayPillar,
        hour: hourPillar,
        hourStatus: hourKnown ? "known" : "unknown",
      },
      dayMaster: dayStem.toString(),
      fiveElements: countFiveElements(stems, branches),
      tenGods,
      luckForward,
      luckStartAge,
      luckPillars,
      limitations,
    };
  }
}
