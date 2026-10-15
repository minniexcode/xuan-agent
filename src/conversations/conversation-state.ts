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
 * Conversation state (FR-MEM-01 / technical-design.md §26.2).
 * Follow-ups reuse the same `chart` and never re-calculate; stored as local JSON with no automatic expiry.
 *
 * Sessions are persisted by default because follow-up depends on them (FR-MEM-01); passing
 * `temporary: true` on a request opts out of persistence for privacy (§8.3).
 */
export interface ConversationState {
  sessionId: string;
  skill: string;
  /** Most recent question (empty for `analyze`, the follow-up text for `ask`). */
  question?: string;
  /** Frozen chart result, reused so same-chart follow-ups skip re-calculation. */
  chart?: BaziChart;
  mode: OutputMode;
  provider: ProviderName;
  model: string;
  /** Summary of this turn's RAG hits. */
  ragHits: RagCitation[];
  /** Safety warnings raised for this turn. */
  safetyWarnings: string[];
  updatedAt: string;
}

/**
 * Envelope-level runtime validation (technical-design.md §26.1, "schema check before write").
 * `chart` and `ragHits` are produced by the calculator / RAG, so their inner fields are not validated here.
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
