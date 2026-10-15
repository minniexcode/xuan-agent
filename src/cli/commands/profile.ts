import type { Command } from "commander";
import { createXuanAgent } from "../../agent/index.js";
import type { BirthInputRequest, OutputMode, ProviderName } from "../../schemas/index.js";
import type { ProfileInput } from "../../schemas/profile.js";
import { renderJson } from "../renderers/json-renderer.js";
import { renderProfile } from "../renderers/profile-renderer.js";

interface ProfileViewOptions {
  user?: string;
  json?: boolean;
}

interface ProfileSaveOptions {
  user?: string;
  date: string;
  time?: string;
  timeUnknown?: boolean;
  gender: string;
  calendar: string;
  place?: string;
  leapMonth?: boolean;
  mode?: string;
  provider?: string;
  confirm?: boolean;
  json?: boolean;
}

interface ProfileDeleteOptions {
  user?: string;
  confirm?: boolean;
  json?: boolean;
}

export function registerProfileCommand(program: Command): void {
  const profile = program.command("profile").description("用户档案管理");

  profile
    .command("view")
    .description("查看用户档案")
    .option("--user <id>", "档案 ID（缺省 default）")
    .option("--json", "JSON 输出")
    .action(async (options: ProfileViewOptions) => {
      const agent = createXuanAgent();
      const found = await agent.getProfile(options.user ?? "default");
      if (found === null) {
        process.stdout.write(`未找到档案：${options.user ?? "default"}\n`);
        return;
      }
      const output = options.json ? renderJson(found) : renderProfile(found);
      process.stdout.write(`${output}\n`);
    });

  profile
    .command("save")
    .description("保存用户档案（出生信息 + 偏好，需 --confirm）")
    .option("--user <id>", "档案 ID（缺省 default）", "default")
    .requiredOption("--date <YYYY-MM-DD>", "出生日期（公历 YYYY-MM-DD；农历同格式）")
    .option("--time <HH:mm>", "出生时间")
    .option("--time-unknown", "出生时间未知")
    .requiredOption("--gender <male|female|unspecified>", "性别")
    .requiredOption("--calendar <solar|lunar>", "历法类型", "solar")
    .option("--place <place>", "出生地（仅备注）")
    .option("--leap-month", "农历闰月（仅 --calendar lunar 时生效）")
    .option("--mode <beginner|advanced>", "偏好输出模式", "advanced")
    .option("--provider <openai-compatible|anthropic|mock>", "偏好 Provider", "openai-compatible")
    .option("--confirm", "确认写入档案")
    .option("--json", "JSON 输出")
    .action(async (options: ProfileSaveOptions) => {
      const birth = {
        date: options.date,
        time: options.time,
        timeUnknown: options.timeUnknown ?? undefined,
        gender: options.gender,
        calendar: options.calendar,
        place: options.place ?? undefined,
        lunarLeapMonth: options.leapMonth ?? undefined,
      } as unknown as BirthInputRequest;

      const input: ProfileInput = {
        userId: options.user,
        birth,
        preferences: {
          mode: (options.mode ?? "advanced") as OutputMode,
          provider: (options.provider ?? "openai-compatible") as ProviderName,
        },
      };

      const agent = createXuanAgent();
      const saved = await agent.saveProfile(input, { confirm: options.confirm === true });
      const output = options.json ? renderJson(saved) : renderProfile(saved);
      process.stdout.write(`${output}\n`);
    });

  profile
    .command("delete")
    .description("删除用户档案（需 --confirm）")
    .option("--user <id>", "档案 ID（缺省 default）", "default")
    .option("--confirm", "确认删除档案")
    .option("--json", "JSON 输出")
    .action(async (options: ProfileDeleteOptions) => {
      const userId = options.user ?? "default";
      const agent = createXuanAgent();
      await agent.deleteProfile(userId, { confirm: options.confirm === true });
      const message = `已删除档案：${userId}`;
      process.stdout.write(`${options.json ? renderJson({ deleted: userId }) : `${message}\n`}\n`);
    });
}
