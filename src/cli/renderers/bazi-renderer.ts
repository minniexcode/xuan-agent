import type { AnalysisResult } from "../../schemas/analysis.js";
import type { BaziChart } from "../../schemas/bazi.js";

const PILLAR_LABEL = { year: "年柱", month: "月柱", day: "日柱", hour: "时柱" } as const;

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

export function renderAnalysisResult(result: AnalysisResult<BaziChart>): string {
  const lines: string[] = [
    renderBaziChart(result.structured),
    "",
    `解读（${result.provider.model}）：`,
    result.content.summary.trim() || "（空）",
    "",
    result.content.boundaryNotice,
  ];
  if (result.safety.warnings.length > 0) {
    lines.push("", "安全提示：", ...result.safety.warnings.map((w) => `  - ${w}`));
  }
  return lines.join("\n");
}
