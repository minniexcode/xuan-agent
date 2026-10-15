import type { Command } from "commander";
import { diagnoseConfig, resolveConfig } from "../../config/index.js";
import { renderJson } from "../renderers/json-renderer.js";
import { renderConfigDoctor } from "../renderers/text-renderer.js";

interface DoctorOptions {
  json?: boolean;
}

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
      // 缺 API key 只算警告，因此默认退出码为 0；有硬错误才非 0。
      process.exitCode = report.ok ? 0 : 1;
    });
}
