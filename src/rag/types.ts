import type { RagCitation } from "../schemas/analysis.js";

/** Knowledge-base domain. `face` / `palm` are V2 physiognomy (相术); V1 uses only `bazi` / `general`. */
export type KnowledgeDomain = "bazi" | "face" | "palm" | "general";

/** Copyright status of a source. Only `usable` entries enter the core knowledge base (FR-RAG-01). */
export type CopyrightStatus = "usable" | "unknown" | "restricted";

/**
 * The three content kinds a citation can be labelled with (FR-RAG-02):
 * original text (原文), interpretation (释义), or agent summary (总结).
 */
export type CitationContentKind = "原文" | "释义" | "总结";

/** A single knowledge chunk — the unit indexed and returned as a citation (technical-design.md §24.2). */
export interface KnowledgeChunk {
  /** Stable chunk id; a local knowledge-base entry with the same id overrides the seed (FR-RAG-01). */
  id: string;
  /** Source document id, usually the filename without extension. */
  documentId: string;
  title: string;
  domain: KnowledgeDomain;
  tags: string[];
  sourceName: string;
  sourceType: string;
  copyrightStatus: CopyrightStatus;
  /** Original or curated text. */
  text: string;
  /** Modern-language interpretation (释义). */
  interpretation?: string;
}

/** Input for a RAG search (FR-RAG-02). */
export interface RagSearchOptions {
  query: string;
  /** Maximum number of results, default 5. */
  topK?: number;
  /** Filter by domain; when omitted no filtering happens (`general` chunks always match). */
  domain?: KnowledgeDomain;
}

/** Result of a RAG search. */
export interface RagSearchResult {
  query: string;
  /** Always `"keyword"` in V1; this is where the degraded mode would be marked when a vector index is unavailable (technical-design.md §24.3). */
  mode: "keyword";
  citations: RagCitation[];
}
