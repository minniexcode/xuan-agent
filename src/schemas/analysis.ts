import type { OutputMode, ProviderName } from "./index.js";

export const BOUNDARY_NOTICE = "本分析用于兴趣型自我探索，不作为现实决策依据。";

export interface AnalysisSection {
  title: string;
  body: string;
}

export interface RagCitation {
  sourceName: string;
  contentKind: string;
  excerpt: string;
  interpretation: string;
  summary: string;
  tags: string[];
  hitNote: string;
}

export interface AnalysisRequest {
  sessionId?: string;
  userId?: string;
  skill: string;
  mode: OutputMode;
  question?: string;
  provider?: ProviderName;
  model?: string;
  saveToProfile?: boolean;
  temporary?: boolean;
}

export interface AnalysisResult<TStructured = unknown> {
  id: string;
  sessionId: string;
  skill: string;
  provider: { name: ProviderName; model: string };
  mode: OutputMode;
  structured: TStructured;
  content: {
    summary: string;
    sections: AnalysisSection[];
    followupQuestions: string[];
    boundaryNotice: string;
  };
  citations: RagCitation[];
  safety: { boundaryApplied: boolean; warnings: string[]; blocked: boolean };
  metadata: {
    createdAt: string;
    durationMs?: number;
    promptVersion?: string;
    ragUsed: boolean;
  };
}
