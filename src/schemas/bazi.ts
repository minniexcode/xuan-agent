import type { BirthInput } from "./index.js";

/** 一柱：天干 + 地支 + 藏干 + 纳音。 */
export interface Pillar {
  /** 例如 "乙亥"。 */
  ganZhi: string;
  /** 例如 "乙"。 */
  heavenlyStem: string;
  /** 例如 "亥"。 */
  earthlyBranch: string;
  /** 例如 ["壬", "甲"]。 */
  hiddenStems: string[];
  /** 例如 "山头火"。 */
  naYin: string;
}

export type FiveElementName = "金" | "木" | "水" | "火" | "土";

/** 某柱天干相对日主的十神。 */
export interface TenGodRelation {
  pillar: "year" | "month" | "day" | "hour";
  tenGod: string;
}

export interface LuckPillar {
  /** 0-based，从起运后第一柱算起。 */
  index: number;
  ganZhi: string;
  startAge: number;
  endAge: number;
}

export interface BaziChartSource {
  library: string;
  version: string;
  generatedAt: string;
}

export interface BaziChart {
  source: BaziChartSource;
  input: BirthInput;
  pillars: {
    year: Pillar;
    month: Pillar;
    day: Pillar;
    hour?: Pillar;
    hourStatus: "known" | "unknown" | "unsupported";
  };
  /** 日主，即日柱天干。 */
  dayMaster: string;
  /** 五行计数：可见的 4 天干 + 4 地支（时辰未知时 6 个），各计 1。 */
  fiveElements: Record<FiveElementName, number>;
  tenGods: TenGodRelation[];
  luckForward: boolean;
  /** 起运岁数。 */
  luckStartAge: number;
  luckPillars: LuckPillar[];
  /** 需明示的限制：时辰未知、晚子时流派、性别缺失、未启用真太阳时等。 */
  limitations: string[];
}
