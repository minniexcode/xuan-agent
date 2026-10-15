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
  /** 包内 seed 目录；缺省按 import.meta.url 探测（dev 与打包后相对路径不同）。 */
  seedDir?: string;
  /** 本地知识库目录，命中同 id 时覆盖 seed（FR-RAG-01）。 */
  knowledgeDir?: string;
}

/** 探测 seed 目录：src/rag 下与 dist/ 下相对项目根的位置不同，逐个候选判断存在性。 */
export function resolveSeedDir(): string {
  const here = fileURLToPath(import.meta.url);
  const candidates = [
    join(dirname(here), "..", "..", "knowledge", "seed"), // dev: src/rag -> 根/knowledge/seed
    join(dirname(here), "..", "knowledge", "seed"), // 打包: dist -> 根/knowledge/seed
    join(process.cwd(), "knowledge", "seed"),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return candidates[0] ?? join(process.cwd(), "knowledge", "seed");
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function tokenize(query: string): string[] {
  const tokens = normalize(query)
    .split(/[\s,，。、；;：:？！?!（）()「」【】""''\-/]+/)
    .filter(Boolean);
  return tokens.length > 0 ? tokens : [normalize(query)];
}

interface Scored {
  score: number;
  matchedTerms: string[];
}

/**
 * 关键词打分。中文术语问题（如「什么是正印」）靠反向命中：标签 / 标题是否出现在 query 里。
 * 只做关键词，不建向量索引（V1，technical-design.md §24.3）。
 */
function scoreChunk(query: string, chunk: KnowledgeChunk): Scored {
  const q = normalize(query);
  const matched = new Set<string>();
  let score = 0;

  for (const tag of chunk.tags) {
    const t = normalize(tag);
    if (t !== "" && (q.includes(t) || t.includes(q))) {
      score += 40;
      matched.add(tag);
    }
  }
  const title = normalize(chunk.title);
  if (title !== "" && (q.includes(title) || title.includes(q))) {
    score += 30;
    matched.add(chunk.title);
  }
  for (const token of tokenize(query)) {
    if (title.includes(token)) {
      score += 15;
      matched.add(token);
    }
    if (chunk.text.toLowerCase().includes(token)) {
      score += 5;
      matched.add(token);
    }
    if ((chunk.interpretation ?? "").toLowerCase().includes(token)) {
      score += 5;
      matched.add(token);
    }
  }
  return { score, matchedTerms: [...matched] };
}

function truncate(text: string, max = 200): string {
  const trimmed = text.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

function deriveSummary(chunk: KnowledgeChunk): string {
  const interpretation = (chunk.interpretation ?? "").trim();
  if (interpretation !== "") {
    const first = interpretation.split(/[。！？\n]/)[0]?.trim() ?? "";
    if (first !== "") return `「${chunk.title}」：${first}`;
  }
  return `「${chunk.title}」：${truncate(chunk.text, 40)}`;
}

function toCitation(chunk: KnowledgeChunk, matchedTerms: string[]): RagCitation {
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

/** V1 关键词检索引擎：加载 seed + 本地知识库，版权过滤后按关键词打分。 */
export class RagEngine {
  private readonly seedDir: string;
  private readonly knowledgeDir?: string;
  private cache: KnowledgeChunk[] | undefined;

  constructor(options: RagEngineOptions = {}) {
    this.seedDir = options.seedDir ?? resolveSeedDir();
    this.knowledgeDir = options.knowledgeDir;
  }

  private load(): KnowledgeChunk[] {
    if (this.cache !== undefined) return this.cache;
    const merged = new Map<string, KnowledgeChunk>();
    for (const chunk of loadKnowledgeDir(this.seedDir)) merged.set(chunk.id, chunk);
    if (this.knowledgeDir !== undefined) {
      for (const chunk of loadKnowledgeDir(this.knowledgeDir)) merged.set(chunk.id, chunk);
    }
    // copyrightStatus 为 unknown / restricted 的不进核心知识库（FR-RAG-01）。
    this.cache = [...merged.values()].filter((chunk) => chunk.copyrightStatus === "usable");
    return this.cache;
  }

  async search(options: RagSearchOptions): Promise<RagSearchResult> {
    const { query, topK = 5, domain } = options;
    const citations = this.load()
      .filter(
        (chunk) => domain === undefined || chunk.domain === domain || chunk.domain === "general",
      )
      .map((chunk) => ({ chunk, ...scoreChunk(query, chunk) }))
      .filter((scored) => scored.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map((scored) => toCitation(scored.chunk, scored.matchedTerms));

    return { query, mode: "keyword", citations };
  }
}
