/** Public surface of the RAG layer: engine, document loader, and types (product-architecture.md §9). */
export { loadKnowledgeDir, parseKnowledgeDocument } from "./document-loader.js";
export { RagEngine, resolveSeedDir } from "./rag-engine.js";
export type {
  CitationContentKind,
  CopyrightStatus,
  KnowledgeChunk,
  KnowledgeDomain,
  RagSearchOptions,
  RagSearchResult,
} from "./types.js";
