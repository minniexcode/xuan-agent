#!/usr/bin/env node
import { loadEnvFile } from "../config/index.js";
import { XuanError } from "../errors/index.js";
import { buildProgram } from "./program.js";

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
