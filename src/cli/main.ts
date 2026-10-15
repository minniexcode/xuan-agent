#!/usr/bin/env node
import { loadEnvFile } from "../config/index.js";
import { XuanError } from "../errors/index.js";
import { buildProgram } from "./program.js";

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
    process.exitCode = 1;
  }
}

await main();
