import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { RagCitation } from "../schemas/analysis.js";
import { loadKnowledgeDir } from "./document-loader.js";
import type {
  CitationContentKind,
  KnowledgeChunk,
  RagSearchOptions,
  RagSearchResult,
} from "./types.js";

export interface RagEngineOptions {
  /** In-package seed directory; when omitted it is probed from `import.meta.url` (the path relative to the project root differs between dev and packaged builds). */
  seedDir?: string;
  /** Local knowledge-base directory; entries sharing an id override the seed (FR-RAG-01). */
  knowledgeDir?: string;
}

/** Probe for the seed directory: its path relative to the project root differs under `src/rag` and `dist/`, so each candidate is tested for existence. */
export function resolveSeedDir(): string {
  const here = fileURLToPath(import.meta.url);
  const candidates = [
    join(dirname(here), "..", "..", "knowledge", "seed"), // dev: src/rag -> <root>/knowledge/seed
    join(dirname(here), "..", "knowledge", "seed"), // packaged: dist -> <root>/knowledge/seed
    join(process.cwd(), "knowledge", "seed"),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return candidates[0] ?? join(process.cwd(), "knowledge", "seed");
}

/** Normalize a string for matching: trim and lowercase. */
function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/** Split a query on whitespace and CJK/ASCII punctuation; falls back to the whole normalized query when nothing splits. */
function tokenize(query: string): string[] {
  const tokens = normalize(query)
    .split(/[\s,，。、；;：:？！?!（）()「」【】""''\-/]+/)
    .filter(Boolean);
  return tokens.length > 0 ? tokens : [normalize(query)];
}

/** A chunk's relevance score plus the terms that produced it. */
interface Scored {
  score: number;
  matchedTerms: string[];
}

/**
 * Keyword scoring. Chinese-term questions (e.g. "什么是正印") rely on reverse matching:
 * whether a tag / title appears *inside* the query.
 *
 * The tag and title checks are deliberately bidirectional (`q.includes(t) || t.includes(q)`).
 * A user asks "什么是正印" while the entry title is just "正印", so forward matching
 * (title contained in the query) alone would miss it — the reverse direction
 * (query contained in the title) is what makes short-term lookups work. Removing either
 * direction breaks term questions.
 *
 * Keyword-only in V1 — no vector index is built (technical-design.md §24.3).
 */
function scoreChunk(query: string, chunk: KnowledgeChunk): Scored {
  const q = normalize(query);
  const matched = new Set<string>();
  let score = 0;

  for (const tag of chunk.tags) {
    const t = normalize(tag);
    // Bidirectional match is deliberate — see the JSDoc above.
    if (t !== "" && (q.includes(t) || t.includes(q))) {
      score += 40; // Tag hit is the strongest signal.
      matched.add(tag);
    }
  }
  const title = normalize(chunk.title);
  if (title !== "" && (q.includes(title) || title.includes(q))) {
    score += 30; // Title hit, weaker than an exact tag.
    matched.add(chunk.title);
  }
  for (const token of tokenize(query)) {
    if (title.includes(token)) {
      score += 15; // Query term found in the title.
      matched.add(token);
    }
    if (chunk.text.toLowerCase().includes(token)) {
      score += 5; // Body-text hit is the weakest signal.
      matched.add(token);
    }
    if ((chunk.interpretation ?? "").toLowerCase().includes(token)) {
      score += 5;
      matched.add(token);
    }
  }
  return { score, matchedTerms: [...matched] };
}

/** Truncate to `max` characters, appending an ellipsis when the text was shortened. */
function truncate(text: string, max = 200): string {
  const trimmed = text.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

/** Build a one-line citation summary from the interpretation's first sentence, falling back to the truncated text. */
function deriveSummary(chunk: KnowledgeChunk): string {
  const interpretation = (chunk.interpretation ?? "").trim();
  if (interpretation !== "") {
    const first = interpretation.split(/[。！？\n]/)[0]?.trim() ?? "";
    if (first !== "") return `「${chunk.title}」：${first}`;
  }
  return `「${chunk.title}」：${truncate(chunk.text, 40)}`;
}

/** Map a scored chunk to the public `RagCitation` shape, keeping source metadata for traceability (FR-RAG-02). */
function toCitation(chunk: KnowledgeChunk, matchedTerms: string[]): RagCitation {
  // `excerpt` is always the original text, so V1 labels every citation 原文; 释义 / 总结 ride in
  // the separate `interpretation` / `summary` fields (FR-RAG-02).
  const contentKind: CitationContentKind = "原文";
  return {
    sourceName: chunk.sourceName,
    contentKind,
    excerpt: truncate(chunk.text),
    interpretation: chunk.interpretation ?? "",
    summary: deriveSummary(chunk),
    tags: chunk.tags,
    hitNote: matchedTerms.length > 0 ? `命中：${matchedTerms.join("、")}` : "关键词命中",
  };
}

/** V1 keyword retrieval engine: loads the seed plus the local knowledge base, filters by copyright, then scores by keyword. */
export class RagEngine {
  private readonly seedDir: string;
  private readonly knowledgeDir?: string;
  private cache: KnowledgeChunk[] | undefined;

  /** Build an engine over the given seed / local directories, probing the seed dir when none is supplied. */
  constructor(options: RagEngineOptions = {}) {
    this.seedDir = options.seedDir ?? resolveSeedDir();
    this.knowledgeDir = options.knowledgeDir;
  }

  /** Lazily load and cache the merged, copyright-filtered chunk set. */
  private load(): KnowledgeChunk[] {
    if (this.cache !== undefined) return this.cache;
    const merged = new Map<string, KnowledgeChunk>();
    // Seed first, then local entries overwrite by id — the local knowledge base takes priority (FR-RAG-01).
    for (const chunk of loadKnowledgeDir(this.seedDir)) merged.set(chunk.id, chunk);
    if (this.knowledgeDir !== undefined) {
      for (const chunk of loadKnowledgeDir(this.knowledgeDir)) merged.set(chunk.id, chunk);
    }
    // Entries whose copyrightStatus is unknown / restricted never enter the core knowledge base (FR-RAG-01).
    this.cache = [...merged.values()].filter((chunk) => chunk.copyrightStatus === "usable");
    return this.cache;
  }

  /** Search the knowledge base for citations matching `query` (FR-RAG-02). */
  async search(options: RagSearchOptions): Promise<RagSearchResult> {
    const { query, topK = 5, domain } = options;
    const citations = this.load()
      .filter(
        // "general" chunks always match, even when a specific domain is requested.
        (chunk) => domain === undefined || chunk.domain === domain || chunk.domain === "general",
      )
      .map((chunk) => ({ chunk, ...scoreChunk(query, chunk) }))
      .filter((scored) => scored.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map((scored) => toCitation(scored.chunk, scored.matchedTerms));

    // `mode` is always "keyword" in V1; vector search is deferred (technical-design.md §24.3).
    // When nothing scores above zero this returns an empty citations array rather than a fabricated source (FR-RAG-02).
    return { query, mode: "keyword", citations };
  }
}
