import type { Command } from "commander";
import { createXuanAgent } from "../../agent/index.js";

interface SessionClearOptions {
  session?: string;
  all?: boolean;
}

/**
 * Register `xuan session clear` (technical-design.md §19).
 */
export function registerSessionCommand(program: Command): void {
  const session = program.command("session").description("会话状态管理");

  session
    .command("clear")
    .description("清理本地会话状态（默认清理全部）")
    .option("--session <id>", "只清理指定会话")
    .option("--all", "清理全部会话（默认行为）")
    .action(async (options: SessionClearOptions) => {
      const agent = createXuanAgent();
      // --session without --all clears just that session; otherwise all sessions go.
      const onlySession = options.session !== undefined && options.all !== true;
      await agent.clearSessions(onlySession ? options.session : undefined);
      const scope = onlySession ? `会话 ${options.session}` : "全部会话";
      process.stdout.write(`已清理${scope}。\n`);
    });
}
