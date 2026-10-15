import type { TextLlmInput } from "../providers/provider.types.js";
import type { BaziChart } from "../schemas/bazi.js";
import type { OutputMode } from "../schemas/index.js";

const SAFETY_SYSTEM = [
  "你是玄枢（xuan-agent），一个面向传统五术与自我探索的 AI。",
  "解读必须中性、克制、非断言：用「倾向」「观察角度」「传统语境下可以理解为」等表达。",
  "绝不使用「必然」「注定」「一定」「大凶」「必发财」「必离婚」等断言或恐吓性语言。",
  "不做医疗、法律、投资、婚育、生死等重大决策建议；不把玄学表述为科学预测。",
  "不给用户贴固定的人格或命运标签。",
].join("\n");

function modeInstruction(mode: OutputMode): string {
  if (mode === "beginner") {
    return "面向普通用户：少术语、短句、生活化。出现术语时用日常说法解释。";
  }
  return "面向有基础的爱好者：直接使用专业术语（四柱、十神、五行、大运），展开结构与依据。";
}

export interface RenderedPrompt {
  input: TextLlmInput;
  version: string;
}

/**
 * 版本化 Prompt。V1 用内联模板；后续可迁移到随包发布的模板文件（technical-design.md §25）。
 */
export class PromptManager {
  buildBaziPrompt(chart: BaziChart, mode: OutputMode): RenderedPrompt {
    const user = [
      `以下是排盘结果（结构化 JSON）：`,
      JSON.stringify(chart),
      "",
      modeInstruction(mode),
      "请基于排盘结果给出解读。",
    ].join("\n");

    return {
      input: {
        system: SAFETY_SYSTEM,
        messages: [{ role: "user", content: user }],
      },
      version: `bazi-${mode}-v0`,
    };
  }
}
