import type { RagCitation } from "../schemas/analysis.js";

/** 知识库域。face / palm 为 V2 相术，V1 仅 bazi / general。 */
export type KnowledgeDomain = "bazi" | "face" | "palm" | "general";

export type CopyrightStatus = "usable" | "unknown" | "restricted";

/** 引用中区分的三类内容（FR-RAG-02）。 */
export type CitationContentKind = "原文" | "释义" | "总结";

/** 单条知识 chunk（technical-design.md §24.2）。 */
export interface KnowledgeChunk {
  id: string;
  documentId: string;
  title: string;
  domain: KnowledgeDomain;
  tags: string[];
  sourceName: string;
  sourceType: string;
  copyrightStatus: CopyrightStatus;
  /** 原文或整理文本。 */
  text: string;
  /** 现代释义。 */
  interpretation?: string;
}

export interface RagSearchOptions {
  query: string;
  /** 最多返回条数，默认 5。 */
  topK?: number;
  /** 按域过滤；缺省不过滤（general 始终命中）。 */
  domain?: KnowledgeDomain;
}

export interface RagSearchResult {
  query: string;
  /** V1 固定 "keyword"；向量索引不可用时在此降级标记（technical-design.md §24.3）。 */
  mode: "keyword";
  citations: RagCitation[];
}
