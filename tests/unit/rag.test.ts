import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { loadKnowledgeDir, parseKnowledgeDocument, RagEngine } from "../../src/rag/index.js";

// The seed directory is built per-file in a temp location so the tests do not
// depend on whatever the shipped knowledge base happens to contain.
const dir = mkdtempSync(join(tmpdir(), "xuan-rag-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

function seed(name: string, body: string): void {
  writeFileSync(join(dir, name), body, "utf8");
}

seed(
  "zhengyin.md",
  [
    "---",
    "id: zhengyin",
    "title: 正印",
    "domain: bazi",
    "tags: [十神, 正印]",
    "source_name: 示例资料",
    "source_type: curated-note",
    "copyright_status: usable",
    "---",
    "",
    "## 原文或整理文本",
    "正印为生我之异性者，主学业、长辈、庇护。",
    "",
    "## 现代释义",
    "正印代表学习力与被支持。",
  ].join("\n"),
);
// A deliberately copyright-restricted entry: it exists to prove that non-usable
// content is filtered out of search results (FR-RAG-01 rule 2).
seed(
  "restricted.md",
  [
    "---",
    "id: restricted",
    "title: 受限条目",
    "domain: bazi",
    "tags: [受限]",
    "source_name: 未知来源",
    "source_type: scraped",
    "copyright_status: restricted",
    "---",
    "",
    "## 原文或整理文本",
    "不应进入核心知识库。",
  ].join("\n"),
);

// Knowledge-document loading (FR-RAG-01): frontmatter parsing and safe fallbacks.
describe("document-loader", () => {
  it("解析 frontmatter 与正文段落", () => {
    const [chunk] = loadKnowledgeDir(dir).filter((c) => c.id === "zhengyin");
    expect(chunk).toBeDefined();
    expect(chunk?.title).toBe("正印");
    expect(chunk?.tags).toEqual(["十神", "正印"]);
    expect(chunk?.text).toContain("正印为生我之异性者");
    expect(chunk?.interpretation).toContain("学习力");
  });

  // A document with no metadata must default to an unknown source and unknown
  // copyright status (which then excludes it from the core knowledge base).
  it("缺失 source_name 时回退为「未知来源」", () => {
    const chunk = parseKnowledgeDocument("## 原文或整理文本\n正文", "no-meta");
    expect(chunk.sourceName).toBe("未知来源");
    expect(chunk.copyrightStatus).toBe("unknown");
  });
});

// Keyword retrieval (FR-RAG-02): results carry sources, and misses are honest.
describe("RagEngine", () => {
  const engine = new RagEngine({ seedDir: dir });

  // Citations must be traceable: each carries a source name and an excerpt that
  // actually contains the query term.
  it("关键词命中返回带来源的引用", async () => {
    const result = await engine.search({ query: "正印", topK: 5 });
    expect(result.mode).toBe("keyword");
    expect(result.citations.length).toBeGreaterThan(0);
    expect(result.citations[0]?.sourceName).toBe("示例资料");
    expect(result.citations[0]?.excerpt).toContain("正印");
  });

  // A natural-language term question should still match via the entry's tags,
  // not only via literal keyword overlap.
  it("术语类问题反向命中标签（什么是正印）", async () => {
    const result = await engine.search({ query: "什么是正印" });
    expect(result.citations.flatMap((c) => c.tags)).toContain("正印");
  });

  // FR-RAG-01 rule 2: the restricted fixture must never surface in results.
  it("copyrightStatus 非 usable 的条目被过滤", async () => {
    const result = await engine.search({ query: "受限", topK: 10 });
    expect(result.citations.some((c) => c.sourceName === "未知来源")).toBe(false);
  });

  // FR-RAG-02 rule 1: no reliable hit means an empty citation list -- never a
  // fabricated source.
  it("无命中时返回空引用，不伪造出处", async () => {
    const result = await engine.search({ query: "说人话" });
    expect(result.citations).toEqual([]);
  });
});
