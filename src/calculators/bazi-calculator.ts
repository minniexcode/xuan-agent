import type { BaziChart } from "../schemas/bazi.js";
import type { BirthInput } from "../schemas/index.js";

/**
 * BaZi chart-calculation interface. Business layers depend only on this
 * contract and never touch third-party library objects directly (ADR-0003).
 */
export interface BaziCalculator {
  /** Calculation source (library + version), for output traceability (FR-BAZI-02). */
  readonly source: { library: string; version: string };
  /** Calculate the structured chart for a normalized birth input. */
  calculate(input: BirthInput): BaziChart;
}
