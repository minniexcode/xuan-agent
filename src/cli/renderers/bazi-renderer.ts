import type { AnalysisResult } from "../../schemas/analysis.js";
import type { BaziChart } from "../../schemas/bazi.js";

const PILLAR_LABEL = { year: "年柱", month: "月柱", day: "日柱", hour: "时柱" } as const;

/** Render the structured chart (Four Pillars (四柱), Five Elements (五行), Ten Gods (十神), Luck Pillars (大运)) as Chinese text. */
export function renderBaziChart(chart: BaziChart): string {
  const { pillars } = chart;
  const hour = pillars.hour?.ganZhi ?? "（未知）";
  const fiveElements = Object.entries(chart.fiveElements)
    .map(([element, count]) => `${element}${count}`)
    .join(" ");
  const tenGods = chart.tenGods
    .map((relation) => `${PILLAR_LABEL[relation.pillar]} ${relation.tenGod}`)
    .join(" / ");

  return [
    "八字排盘",
    "",
    `四柱：${pillars.year.ganZhi} ${pillars.month.ganZhi} ${pillars.day.ganZhi} ${hour}`,
    `日主：${chart.dayMaster}`,
    `五行：${fiveElements}`,
    `十神：${tenGods}`,
    "",
    `大运（${chart.luckForward ? "顺" : "逆"}，起运 ${chart.luckStartAge} 岁）：`,
    ...chart.luckPillars.map(
      (luck) => `  ${luck.index}. ${luck.ganZhi}（${luck.startAge}–${luck.endAge} 岁）`,
    ),
    "",
    ...chart.limitations.map((limitation) => `- ${limitation}`),
    "",
    `排盘来源：${chart.source.library} ${chart.source.version}`,
  ].join("\n");
}

/**
 * Render a full analysis (chart + interpretation + citations + safety notes) as Chinese text.
 *
 * Serves `xuan bazi analyze` and `xuan bazi ask`; the trailing session hint lets the
 * user continue with `xuan bazi ask` (FR-BAZI-05 follow-up / same-chart reuse).
 */
export function renderAnalysisResult(result: AnalysisResult<BaziChart>): string {
  const lines: string[] = [
    renderBaziChart(result.structured),
    "",
    `解读（${result.provider.model}）：`,
    result.content.summary.trim() || "（空）",
  ];
  if (result.citations.length > 0) {
    lines.push("", "参考依据：");
    result.citations.forEach((citation, i) => {
      lines.push(`  ${i + 1}. ${citation.sourceName}：${citation.excerpt}`);
    });
  }
  lines.push("", result.content.boundaryNotice);
  if (result.safety.warnings.length > 0) {
    lines.push("", "安全提示：", ...result.safety.warnings.map((w) => `  - ${w}`));
  }
  lines.push(
    "",
    `会话 ID：${result.sessionId}（追问：xuan bazi ask --session ${result.sessionId} --question "…"）`,
  );
  return lines.join("\n");
}
