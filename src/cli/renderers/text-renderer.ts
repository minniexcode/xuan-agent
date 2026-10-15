import type { ConfigDoctorReport } from "../../config/index.js";

const onOff = (value: boolean): string => (value ? "开启" : "关闭");

export function renderConfigDoctor(report: ConfigDoctorReport): string {
  const { summary } = report;
  const lines: string[] = [
    "玄枢配置检查",
    "",
    `Provider  : ${summary.provider.name}`,
    `Model     : ${summary.provider.model}`,
    `Base URL  : ${summary.provider.baseUrl}`,
    `API key   : ${summary.provider.apiKeyPresent ? "已配置" : "未配置"}`,
    `Vision    : ${onOff(summary.vision)}`,
    `Streaming : ${onOff(summary.streaming)}`,
    `日志级别  : ${summary.logLevel}`,
    "",
    `数据目录  : ${summary.paths.dataDir}`,
    `档案目录  : ${summary.paths.profilesDir}`,
    `会话目录  : ${summary.paths.sessionsDir}`,
    `知识库    : ${summary.paths.knowledgeDir ?? "（包内 seed，内容待补）"}`,
    "",
    `Node      : ${summary.node}`,
  ];

  if (report.warnings.length > 0) {
    lines.push("", "警告：", ...report.warnings.map((w) => `  - ${w}`));
  }
  if (report.errors.length > 0) {
    lines.push("", "错误：", ...report.errors.map((e) => `  - ${e}`));
  } else {
    lines.push("", "未发现配置错误。");
  }

  return lines.join("\n");
}
