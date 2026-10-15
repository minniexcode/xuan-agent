import type { BaziChart } from "../../schemas/bazi.js";

export function renderBaziChart(chart: BaziChart): string {
  const { pillars } = chart;
  const hour = pillars.hour?.ganZhi ?? "（未知）";
  const fiveElements = Object.entries(chart.fiveElements)
    .map(([element, count]) => `${element}${count}`)
    .join(" ");
  const pillarLabel = { year: "年柱", month: "月柱", day: "日柱", hour: "时柱" } as const;
  const tenGods = chart.tenGods
    .map((relation) => `${pillarLabel[relation.pillar]} ${relation.tenGod}`)
    .join(" / ");

  const lines: string[] = [
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
    "解读：待接入 Provider（Milestone 3，当前为 mock）",
  ];
  return lines.join("\n");
}
