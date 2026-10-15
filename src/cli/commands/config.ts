import type { Command } from "commander";
import { diagnoseConfig, resolveConfig } from "../../config/index.js";
import { renderJson } from "../renderers/json-renderer.js";
import { renderConfigDoctor } from "../renderers/text-renderer.js";

interface DoctorOptions {
  json?: boolean;
}

/**
 * Register `xuan config doctor` (technical-design.md §19).
 *
 * The report only indicates whether the API key is present, never its value.
 */
export function registerConfigCommand(program: Command): void {
  const config = program.command("config").description("配置相关命令");

  config
    .command("doctor")
    .description("检查配置健康状态（只显示 API key 是否存在，不显示内容）")
    .option("--json", "以 JSON 输出")
    .action((options: DoctorOptions) => {
      const report = diagnoseConfig(resolveConfig());
      const output = options.json ? renderJson(report) : renderConfigDoctor(report);
      process.stdout.write(`${output}\n`);
      // A missing API key is only a warning, so the default exit code is 0;
      // only hard errors yield a non-zero code. Scripts and smoke tests rely on this.
      process.exitCode = report.ok ? 0 : 1;
    });
}
