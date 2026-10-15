import type { BaziChart } from "../schemas/bazi.js";
import type { BirthInput } from "../schemas/index.js";

/**
 * 排盘接口。业务层只依赖本接口，不直接接触第三方库对象（ADR-0003）。
 */
export interface BaziCalculator {
  readonly source: { library: string; version: string };
  calculate(input: BirthInput): BaziChart;
}
