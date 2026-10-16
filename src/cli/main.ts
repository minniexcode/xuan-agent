#!/usr/bin/env node
import { loadEnvFile } from "../config/index.js";
import { XuanError } from "../errors/index.js";
import { buildProgram } from "./program.js";

/** One-line recovery hint per error code, printed to stderr (technical-design.md §19.2). */
const RECOVERY_HINTS: Partial<Record<XuanError["code"], string>> = {
  VALIDATION_ERROR: "请检查出生日期/时间格式（如 --date 1995-03-12 --time 08:30）。",
  CALCULATION_ERROR: "排盘失败，请确认输入日期有效后重试。",
  PROVIDER_CONFIG_ERROR: "请在 .env 配置 XUAN_API_KEY（或改用 mock provider）。",
  PROVIDER_CAPABILITY_ERROR: "该 Provider 尚未实现，请换用 openai-compatible 或 mock。",
  LLM_ERROR: "调用 LLM 失败，请检查网络与 Provider 配置。",
  PROFILE_PERMISSION_REQUIRED: "保存/删除档案需显式确认（--confirm）。",
  STORAGE_ERROR: "本地存储操作失败，请检查数据目录权限。",
};

/**
 * CLI entry point: loads `.env` then runs the commander program.
 *
 * `loadEnvFile(".env")` runs first so CLI configuration is sourced from `.env`
 * before any command executes. The catch-all converts any thrown value into a
 * `XuanError` and sets a non-zero exit code so failures reach the shell.
 */
async function main(): Promise<void> {
  loadEnvFile(".env");

  try {
    await buildProgram().parseAsync(process.argv);
  } catch (err) {
    const failure = XuanError.from(err, {
      code: "VALIDATION_ERROR",
      message: "命令执行失败",
      stage: "input",
      recoverable: false,
    });
    process.stderr.write(`[${failure.code}] ${failure.message}\n`);
    const hint = RECOVERY_HINTS[failure.code];
    if (hint !== undefined) process.stderr.write(`提示：${hint}\n`);
    process.exitCode = 1;
  }
}

await main();
