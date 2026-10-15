import { Command } from "commander";
import { VERSION } from "../version.js";
import { registerBaziCommand } from "./commands/bazi.js";
import { registerConfigCommand } from "./commands/config.js";
import { registerProfileCommand } from "./commands/profile.js";
import { registerProviderCommand } from "./commands/provider.js";
import { registerRagCommand } from "./commands/rag.js";
import { registerSessionCommand } from "./commands/session.js";

/**
 * Build the `xuan` CLI program (technical-design.md §19) without side effects.
 *
 * Deliberately side-effect free (no `parseAsync` here) so tests can call
 * `parseAsync` directly and assert on output without spawning a subprocess.
 */
export function buildProgram(): Command {
  const program = new Command();

  program
    .name("xuan")
    .description("玄枢（xuan-agent）——面向五术与自我探索的 AI Agent")
    .version(VERSION, "-v, --version", "显示版本");

  registerBaziCommand(program);
  registerConfigCommand(program);
  registerProfileCommand(program);
  registerProviderCommand(program);
  registerRagCommand(program);
  registerSessionCommand(program);

  return program;
}
