import type { OutputMode, ProviderName } from "./index.js";

/**
 * Mandatory boundary notice attached to every analysis result (SafetyGuard / ADR-0009).
 * This is a required product output, not decoration — it must reach the user verbatim.
 */
export const BOUNDARY_NOTICE = "本分析用于兴趣型自我探索，不作为现实决策依据。";

/** One titled block of the rendered interpretation. */
export interface AnalysisSection {
  title: string;
  body: string;
}

/** A citation backing the interpretation with a knowledge-base excerpt (FR-RAG-02). */
export interface RagCitation {
  /** Knowledge source name, e.g. the classical text title. */
  sourceName: string;
  /** What the excerpt is: "原文" (verbatim), "释义" (gloss), or "总结" (summary). */
  contentKind: string;
  /** The retrieved passage. */
  excerpt: string;
  /** How this passage relates to the current chart. */
  interpretation: string;
  summary: string;
  /** Free-form tags for filtering / display. */
  tags: string[];
  /** Why this chunk was retrieved, e.g. which query terms matched. */
  hitNote: string;
}

/** Request to run an analysis skill (FR-BAZI-03 / FR-BAZI-04). */
export interface AnalysisRequest {
  /** Existing session to continue; omit to start a new one. */
  sessionId?: string;
  userId?: string;
  /** Skill identifier, e.g. "bazi". */
  skill: string;
  mode: OutputMode;
  /** Optional user question that steers the interpretation. */
  question?: string;
  provider?: ProviderName;
  model?: string;
  /** Persist the result to the user profile (requires confirmation). */
  saveToProfile?: boolean;
  /** Run without persisting session state. */
  temporary?: boolean;
}

/** Same-chart follow-up input (FR-BAZI-05). When sessionId is omitted, continues the most recent session. */
export interface FollowupInput {
  sessionId?: string;
  question: string;
  mode?: OutputMode;
}

/**
 * Unified analysis result. `TStructured` is generic on purpose: it is the hook that
 * lets V2 相术 reuse this same result shape with a different structured payload
 * (defaults to `unknown` when the caller does not care).
 */
export interface AnalysisResult<TStructured = unknown> {
  id: string;
  sessionId: string;
  skill: string;
  provider: { name: ProviderName; model: string };
  mode: OutputMode;
  /** Skill-specific structured payload (e.g. a BaziChart for the bazi skill). */
  structured: TStructured;
  content: {
    summary: string;
    /** Known gap: currently always empty; sectioned output is not yet produced. */
    sections: AnalysisSection[];
    /** Suggested follow-up questions for the same chart (FR-BAZI-05). */
    followupQuestions: string[];
    /** Verbatim BOUNDARY_NOTICE as required by SafetyGuard. */
    boundaryNotice: string;
  };
  citations: RagCitation[];
  safety: { boundaryApplied: boolean; warnings: string[]; blocked: boolean };
  metadata: {
    createdAt: string;
    /** Wall-clock duration of the analysis in milliseconds. */
    durationMs?: number;
    /** Prompt template version used, for reproducibility. */
    promptVersion?: string;
    ragUsed: boolean;
  };
}
