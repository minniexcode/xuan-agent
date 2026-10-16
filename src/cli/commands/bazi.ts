import type { Command } from "commander";
import { createXuanAgent } from "../../agent/index.js";
import type { BirthInputRequest } from "../../schemas/index.js";
import { renderAnalysisResult } from "../renderers/bazi-renderer.js";
import { renderJson } from "../renderers/json-renderer.js";

interface AnalyzeOptions {
  date: string;
  time?: string;
  timeUnknown?: boolean;
  gender: string;
  calendar: string;
  place?: string;
  mode?: string;
  leapMonth?: boolean;
  json?: boolean;
}

interface AskOptions {
  session?: string;
  question: string;
  mode?: string;
  json?: boolean;
}

/**
 * Register `xuan bazi analyze` and `xuan bazi ask` (technical-design.md §19).
 */
export function registerBaziCommand(program: Command): void {
  const bazi = program.command("bazi").description("八字排盘与解读");

  bazi
    .command("analyze")
    .description("采集出生信息、排盘并用 LLM 解读")
    .requiredOption(
      "--date <YYYY-MM-DD>",
      "出生日期（公历 YYYY-MM-DD；农历同格式，闰月见 --leap-month）",
    )
    .option("--time <HH:mm>", "出生时间")
    .option("--time-unknown", "出生时间未知")
    .requiredOption("--gender <male|female|unspecified>", "性别")
    .requiredOption("--calendar <solar|lunar>", "历法类型", "solar")
    .option("--place <place>", "出生地（仅备注，不参与计算）")
    .option("--mode <beginner|advanced>", "输出模式", "advanced")
    .option("--leap-month", "农历闰月（仅 --calendar lunar 时生效）")
    .option("--json", "JSON 输出")
    .action(async (options: AnalyzeOptions) => {
      // Commander yields strings for optional flags, so the raw object is cast
      // to the request type; the agent validates and narrows it.
      const request = {
        date: options.date,
        time: options.time,
        timeUnknown: options.timeUnknown ?? undefined,
        gender: options.gender,
        calendar: options.calendar,
        place: options.place ?? undefined,
        mode: options.mode ?? undefined,
        lunarLeapMonth: options.leapMonth ?? undefined,
      } as unknown as BirthInputRequest;

      const agent = createXuanAgent();
      const result = await agent.analyzeBazi(request);
      process.stdout.write(`${options.json ? renderJson(result) : renderAnalysisResult(result)}\n`);
    });

  bazi
    .command("ask")
    .description("对最近一次（或指定）会话做同盘追问")
    .option("--session <id>", "会话 ID（缺省续最近一次会话）")
    .requiredOption("--question <text>", "追问内容")
    .option("--mode <beginner|advanced>", "输出模式（缺省沿用会话模式）")
    .option("--json", "JSON 输出")
    .action(async (options: AskOptions) => {
      const agent = createXuanAgent();
      const result = await agent.askFollowup({
        sessionId: options.session,
        question: options.question,
        // Omitted --mode falls back to the session's stored mode inside the agent.
        mode: options.mode as "beginner" | "advanced" | undefined,
      });
      process.stdout.write(`${options.json ? renderJson(result) : renderAnalysisResult(result)}\n`);
    });
}
