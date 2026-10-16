import type { TextLlmInput } from "../providers/provider.types.js";
import type { RagCitation } from "../schemas/analysis.js";
import type { BaziChart } from "../schemas/bazi.js";
import type { OutputMode } from "../schemas/index.js";

// Runtime system prompt sent to the LLM — kept in Chinese on purpose (it is not a
// comment). This is the PRIMARY safety defence (product-architecture.md §8); the
// SafetyGuard output audit is only the post-hoc backstop.
const SAFETY_SYSTEM = [
  "你是玄枢（xuan-agent），一个面向传统五术与自我探索的 AI。",
  "解读必须中性、克制、非断言：用「倾向」「观察角度」「传统语境下可以理解为」等表达。",
  "绝不使用「必然」「注定」「一定」「大凶」「必发财」「必离婚」等断言或恐吓性语言。",
  "不做医疗、法律、投资、婚育、生死等重大决策建议；不把玄学表述为科学预测。",
  "不给用户贴固定的人格或命运标签。",
].join("\n");

/** Per-mode instruction line appended to the prompt body (beginner vs advanced). */
function modeInstruction(mode: OutputMode): string {
  if (mode === "beginner") {
    return "面向普通用户：少术语、短句、生活化。出现术语时用日常说法解释。";
  }
  return "面向有基础的爱好者：直接使用专业术语（四柱、十神、五行、大运），展开结构与依据。";
}

/**
 * Structured-output instruction: ask the LLM to segment its answer into `## 标题`
 * blocks and finish with a `## 可继续追问` bullet list. The section parser degrades
 * to plain text when headings are absent (FR-BAZI-03 / FR-BAZI-04).
 */
function sectionsInstruction(mode: OutputMode): string {
  const sections =
    mode === "beginner"
      ? "关键词、整体摘要、观察点（性格 / 行为 / 沟通 / 关系 / 成长中择要）"
      : "四柱结构、日主与月令、五行分布与生克、十神组合、大运与流年观察";
  return [
    "请用 Markdown 二级标题（`## 标题`）分段输出解读，标题用中文，依次覆盖：",
    `  ${sections}。`,
    "最后加一段 `## 可继续追问`，列出 2–3 个可继续追问的问题，每行一条、以 `- ` 开头。",
  ].join("\n");
}

/** Render retrieved RAG citations into a prompt section, keeping excerpt and interpretation distinct. */
function formatCitations(citations: RagCitation[]): string {
  if (citations.length === 0) {
    return "（未检索到额外依据，仅基于盘面回答。）";
  }
  return [
    "以下为知识库检索到的参考（区分原文与释义，仅作解释依据，不作定论）：",
    ...citations.map(
      (citation, i) =>
        `${i + 1}. ${citation.sourceName}（${citation.hitNote}）\n` +
        `   原文：${citation.excerpt}\n` +
        `   释义：${citation.interpretation || "（无）"}`,
    ),
  ].join("\n");
}

/** A prompt ready to hand to a provider, plus the version tag it must be recorded under. */
export interface RenderedPrompt {
  input: TextLlmInput;
  version: string;
}

/**
 * Versioned prompt builder. V1 uses inline templates; these may later migrate to
 * template files shipped with the package (technical-design.md §25).
 */
export class PromptManager {
  /**
   * Build the chart-interpretation prompt. The returned `version` is recorded into
   * `AnalysisResult.metadata.promptVersion` for provider comparison and regression (§25.3).
   */
  buildBaziPrompt(
    chart: BaziChart,
    mode: OutputMode,
    citations: RagCitation[] = [],
  ): RenderedPrompt {
    const sections = [
      "以下是排盘结果（结构化 JSON）：",
      JSON.stringify(chart),
      "",
      modeInstruction(mode),
      sectionsInstruction(mode),
    ];
    // Beginner mode omits classical citations; advanced mode injects RAG evidence.
    // See FR-RAG-02 rule 2 (FR-BAZI-04's "明确不做" line on RAG citations is stale).
    if (mode !== "beginner" && citations.length > 0) {
      sections.push("", formatCitations(citations));
    }
    sections.push("请基于排盘结果给出解读。");

    return {
      input: {
        system: SAFETY_SYSTEM,
        messages: [{ role: "user", content: sections.join("\n") }],
      },
      version: `bazi-${mode}-v1`,
    };
  }

  /** Same-chart follow-up: reuses the already-computed chart, no re-calculation (FR-BAZI-05). */
  buildFollowupPrompt(
    chart: BaziChart,
    question: string,
    mode: OutputMode,
    citations: RagCitation[] = [],
  ): RenderedPrompt {
    const user = [
      `以下是已排好的盘面（结构化 JSON，本轮沿用，不重新排盘）：`,
      JSON.stringify(chart),
      "",
      `用户追问：${question}`,
      "",
      formatCitations(citations),
      "",
      modeInstruction(mode),
      "请结合当前盘面回答追问，不要脱离盘面泛泛而谈。",
    ].join("\n");

    return {
      input: {
        system: SAFETY_SYSTEM,
        messages: [{ role: "user", content: user }],
      },
      version: `bazi-followup-${mode}-v0`,
    };
  }
}
