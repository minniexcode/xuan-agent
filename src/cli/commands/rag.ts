import type { Command } from "commander";
import { createXuanAgent } from "../../agent/index.js";
import { renderJson } from "../renderers/json-renderer.js";
import { renderRagResult } from "../renderers/rag-renderer.js";

interface RagOptions {
  query: string;
  skill?: string;
  topK?: string;
  json?: boolean;
}

export function registerRagCommand(program: Command): void {
  const rag = program.command("rag").description("知识库检索与引用");

  rag
    .command("search")
    .description("关键词检索知识库并返回带来源的引用")
    .requiredOption("--query <text>", "检索关键词")
    .option("--skill <bazi>", "限定 Skill（V1 仅 bazi）")
    .option("--top-k <n>", "最多返回条数", "5")
    .option("--json", "JSON 输出")
    .action(async (options: RagOptions) => {
      const agent = createXuanAgent();
      const domain = options.skill === "bazi" ? "bazi" : undefined;
      const topK = Number.parseInt(options.topK ?? "5", 10);
      const result = await agent.searchRag({ query: options.query, topK, domain });
      const output = options.json ? renderJson(result) : renderRagResult(result);
      process.stdout.write(`${output}\n`);
    });
}
