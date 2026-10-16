import type { Command } from "commander";
import { listProviders } from "../../index.js";
import { renderJson } from "../renderers/json-renderer.js";
import { renderProviderList } from "../renderers/provider-renderer.js";

interface ProviderListOptions {
  json?: boolean;
}

/**
 * Register `xuan provider list` (technical-design.md §19).
 */
export function registerProviderCommand(program: Command): void {
  const provider = program.command("provider").description("Provider 能力");

  provider
    .command("list")
    .description("列出已知 Provider 及其能力")
    .option("--json", "JSON 输出")
    .action((options: ProviderListOptions) => {
      const providers = listProviders();
      const output = options.json ? renderJson(providers) : renderProviderList(providers);
      process.stdout.write(`${output}\n`);
    });
}
