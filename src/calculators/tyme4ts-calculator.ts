// The only module that imports `tyme4ts`. Every other layer depends on the
// `BaziCalculator` interface, keeping the library swappable (ADR-0003).
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
// Pinned library version recorded in the chart source (FR-BAZI-02).
const VERSION = "1.5.3";
// Default number of Luck Pillars (大运) to emit — 8 steps per FR-BAZI-02.
const LUCK_STEPS = 8;

/** Map a tyme4ts `SixtyCycle` into the library-independent `Pillar` shape. */
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

/**
 * Convert birth input into a tyme4ts `SolarTime`.
 * Falls back to 12:00 when the hour is unknown — that anchor is only needed to
 * obtain the day pillar; the hour pillar is flagged missing via `hourKnown`.
 */
function resolveSolarTime(input: BirthInput): { solarTime: SolarTime; hourKnown: boolean } {
  const [year, month, day] = input.date.split("-").map(Number) as [number, number, number];
  // Unknown hour still needs a concrete time to anchor the day pillar; 12:00 is
  // a safe midday placeholder (FR-BAZI-01).
  const [hour, minute] = (input.time ?? "12:00").split(":").map(Number) as [number, number];

  // Leap months are encoded as a negative month (-4 = leap 4th month); lunar only.
  // See requirements.md FR-BAZI-01.
  const lunarMonth = input.calendar === "lunar" && input.lunarLeapMonth ? -Math.abs(month) : month;
  const hourKnown = !input.timeUnknown;

  const solarTime =
    input.calendar === "lunar"
      ? LunarHour.fromYmdHms(year, lunarMonth, day, hour, minute, 0).getSolarTime()
      : SolarTime.fromYmdHms(year, month, day, hour, minute, 0);

  return { solarTime, hourKnown };
}

/**
 * Tally the five elements over the visible stems and branches only. Hidden
 * stems (藏干) are deliberately not counted, matching the documented
 * `BaziChart.fiveElements` distribution (each visible stem/branch counts 1).
 */
function countFiveElements(
  stems: HeavenStem[],
  branches: EarthBranch[],
): Record<FiveElementName, number> {
  const counts: Record<FiveElementName, number> = { 金: 0, 木: 0, 水: 0, 火: 0, 土: 0 };
  for (const stem of stems) counts[stem.getElement().toString() as FiveElementName] += 1;
  for (const branch of branches) counts[branch.getElement().toString() as FiveElementName] += 1;
  return counts;
}

/** tyme4ts-backed `BaziCalculator`; the V1 default implementation. */
export class Tyme4tsBaziCalculator implements BaziCalculator {
  readonly source = { library: LIBRARY, version: VERSION };

  /** Build the full structured chart for a normalized birth input (FR-BAZI-02). */
  calculate(input: BirthInput): BaziChart {
    const { solarTime, hourKnown } = resolveSolarTime(input);
    const eightChar = solarTime.getLunarHour().getEightChar();

    const yearPillar = toPillar(eightChar.getYear());
    const monthPillar = toPillar(eightChar.getMonth());
    const dayPillar = toPillar(eightChar.getDay());
    // Hour pillar is omitted when the hour is unknown (FR-BAZI-01).
    const hourPillar = hourKnown ? toPillar(eightChar.getHour()) : undefined;

    const dayStem = eightChar.getDay().getHeavenStem();
    // Ten Gods (十神): each pillar's stem measured against the day master.
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

    // Each `limitations` entry is a deliberate product requirement — never
    // "simplify" them away: unknown hour (FR-BAZI-01), the 23:00–23:59
    // day-pillar school (FR-BAZI-02 / ADR-0010), true solar time deferred to V2,
    // and missing gender (FR-BAZI-01).
    const limitations: string[] = [];
    if (!hourKnown) limitations.push("时辰未知：时柱缺失，精度受限");
    if (input.time?.startsWith("23:")) {
      limitations.push("晚子时（23:00–23:59）：日柱按次日计算（School B，可切换）");
    }
    limitations.push("未启用真太阳时");

    let luckForward = false;
    let luckStartAge = 0;
    const luckPillars: LuckPillar[] = [];
    // Luck Pillars (大运) need gender for forward/reverse direction; when gender
    // is `unspecified` they are intentionally skipped and flagged above.
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
