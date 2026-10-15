import { z } from "zod";
import type { RagCitation } from "../schemas/analysis.js";
import type { BaziChart } from "../schemas/bazi.js";
import {
  type OutputMode,
  OutputModeSchema,
  type ProviderName,
  ProviderNameSchema,
} from "../schemas/index.js";

/**
 * 会话状态（FR-MEM-01 / technical-design.md §26.2）。
 * 追问复用同一份 `chart`，绝不重新排盘；本地 JSON，不做自动过期。
 */
export interface ConversationState {
  sessionId: string;
  skill: string;
  /** 最近一次问题（analyze 时为空，ask 时为追问内容）。 */
  question?: string;
  /** 冻结的排盘结果。 */
  chart?: BaziChart;
  mode: OutputMode;
  provider: ProviderName;
  model: string;
  /** 本轮 RAG 命中摘要。 */
  ragHits: RagCitation[];
  safetyWarnings: string[];
  updatedAt: string;
}

/**
 * 信封层运行时校验（technical-design.md §26.1「写入前 schema 校验」）。
 * `chart` 与 `ragHits` 由排盘器 / RAG 产出，这里不深校验内部字段。
 */
export const ConversationStateSchema = z.object({
  sessionId: z.string().min(1),
  skill: z.string().min(1),
  question: z.string().optional(),
  chart: z.unknown().optional(),
  mode: OutputModeSchema,
  provider: ProviderNameSchema,
  model: z.string().min(1),
  ragHits: z.array(z.unknown()),
  safetyWarnings: z.array(z.string()),
  updatedAt: z.string().min(1),
});
