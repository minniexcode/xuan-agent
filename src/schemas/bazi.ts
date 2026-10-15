import type { BirthInput } from "./index.js";

/** One pillar (柱): heavenly stem + earthly branch + hidden stems + naYin. */
export interface Pillar {
  /** Combined stem-branch, e.g. "乙亥". */
  ganZhi: string;
  /** e.g. "乙". */
  heavenlyStem: string;
  /** e.g. "亥". */
  earthlyBranch: string;
  /** Hidden stems (藏干), e.g. ["壬", "甲"]. */
  hiddenStems: string[];
  /** NaYin (纳音), e.g. "山头火". */
  naYin: string;
}

/** The five elements (五行): metal, wood, water, fire, earth. */
export type FiveElementName = "金" | "木" | "水" | "火" | "土";

/** The ten-god (十神) relation of one pillar's stem relative to the day master. */
export interface TenGodRelation {
  /** Which pillar this relation belongs to. */
  pillar: "year" | "month" | "day" | "hour";
  /** Ten-god name, e.g. "正官". */
  tenGod: string;
}

/** One major luck pillar (大运). */
export interface LuckPillar {
  /** 0-based, counting from the first pillar after luck onset (起运). */
  index: number;
  ganZhi: string;
  /** Age (years) at which this luck pillar begins. */
  startAge: number;
  /** Age (years) at which this luck pillar ends. */
  endAge: number;
}

/** Provenance of a chart: which calculator produced it and when (FR-BAZI-02). */
export interface BaziChartSource {
  library: string;
  version: string;
  generatedAt: string;
}

/** A full BaZi chart: four pillars plus derived fields, all produced by BaziCalculator (FR-BAZI-02). */
export interface BaziChart {
  source: BaziChartSource;
  input: BirthInput;
  pillars: {
    year: Pillar;
    month: Pillar;
    day: Pillar;
    /** Absent when the birth time is unknown. */
    hour?: Pillar;
    /** "unknown" when the hour is unavailable; "unsupported" is reserved for cases the library cannot produce. */
    hourStatus: "known" | "unknown" | "unsupported";
  };
  /** Day master (日主), i.e. the day pillar's heavenly stem. */
  dayMaster: string;
  /** Five-element counts: visible 4 stems + 4 branches (6 when the hour is unknown), each counted once. */
  fiveElements: Record<FiveElementName, number>;
  tenGods: TenGodRelation[];
  /** True when luck pillars run forward (顺排) from the month pillar. */
  luckForward: boolean;
  /** Age (years) at which the first luck pillar starts (起运岁数). */
  luckStartAge: number;
  luckPillars: LuckPillar[];
  /** Limitations that must be surfaced: unknown hour, 晚子时 school, missing gender, no true solar time, etc. */
  limitations: string[];
}
