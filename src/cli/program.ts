import { Command } from "commander";
import { VERSION } from "../version.js";
import { registerConfigCommand } from "./commands/config.js";

/** 构建 CLI 程序。不产生副作用，便于测试直接断言。 */
export function buildProgram(): Command {
  const program = new Command();

  program
    .name("xuan")
    .description("玄枢（xuan-agent）——面向五术与自我探索的 AI Agent")
    .version(VERSION, "-v, --version", "显示版本");

  registerConfigCommand(program);

  return program;
}
