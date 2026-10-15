import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { CopyrightStatus, KnowledgeChunk, KnowledgeDomain } from "./types.js";

/** Domains accepted from frontmatter; anything else falls back to `general`. */
const DOMAINS = new Set<KnowledgeDomain>(["bazi", "face", "palm", "general"]);
/** Copyright statuses accepted from frontmatter; anything else falls back to `unknown`. */
const COPYRIGHT = new Set<CopyrightStatus>(["usable", "unknown", "restricted"]);

/**
 * Minimal, zero-dependency frontmatter parser: `---`-delimited key/value lines.
 * Deliberately does not parse nested YAML — only the flat keys the seed uses.
 */
export function parseFrontmatter(content: string): {
  meta: Record<string, string>;
  body: string;
} {
  const lines = content.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return { meta: {}, body: content };

  const meta: Record<string, string> = {};
  let i = 1;
  for (; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined || line.trim() === "---") break;
    const eq = line.indexOf(":");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (key !== "") meta[key] = line.slice(eq + 1).trim();
  }
  return { meta, body: lines.slice(i + 1).join("\n") };
}

/** Parse a frontmatter value (`[a, b]` or `a, b`) into a trimmed, non-empty tag list. */
function parseTags(value: string): string[] {
  const trimmed = value.trim();
  const inner = trimmed.startsWith("[") && trimmed.endsWith("]") ? trimmed.slice(1, -1) : trimmed;
  return inner
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

/** Split the body into original text (原文) and interpretation (释义) by loose `## ` heading match. */
function splitSections(body: string): { text: string; interpretation: string } {
  const buckets = { text: [] as string[], interpretation: [] as string[] };
  let current: keyof typeof buckets | null = null;
  for (const line of body.split(/\r?\n/)) {
    const heading = /^##\s*(.*)$/.exec(line.trim());
    if (heading) {
      const title = heading[1] ?? "";
      if (title.includes("原文") || title.includes("整理")) current = "text";
      else if (title.includes("释义")) current = "interpretation";
      else current = null;
      continue;
    }
    if (current !== null) buckets[current].push(line);
  }
  return {
    text: buckets.text.join("\n").trim(),
    interpretation: buckets.interpretation.join("\n").trim(),
  };
}

/** Parse one knowledge document (markdown + frontmatter). `documentId` is normally the filename without extension. */
export function parseKnowledgeDocument(content: string, documentId: string): KnowledgeChunk {
  const { meta, body } = parseFrontmatter(content);
  const { text, interpretation } = splitSections(body);
  const rawDomain = meta.domain as KnowledgeDomain | undefined;
  const rawCopyright = meta.copyright_status as CopyrightStatus | undefined;
  const chunk: KnowledgeChunk = {
    id: meta.id || documentId,
    documentId,
    title: meta.title || documentId,
    domain: rawDomain !== undefined && DOMAINS.has(rawDomain) ? rawDomain : "general",
    tags: meta.tags ? parseTags(meta.tags) : [],
    sourceName: meta.source_name || "未知来源",
    sourceType: meta.source_type || "curated-note",
    copyrightStatus:
      rawCopyright !== undefined && COPYRIGHT.has(rawCopyright) ? rawCopyright : "unknown",
    text,
  };
  if (interpretation !== "") chunk.interpretation = interpretation;
  return chunk;
}

/**
 * Load every markdown document in a directory.
 * A missing directory returns `[]` rather than throwing — the local knowledge base is optional, not required.
 */
export function loadKnowledgeDir(dir: string): KnowledgeChunk[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }
  return entries
    .filter((file) => file.endsWith(".md") || file.endsWith(".markdown"))
    .map((file) => {
      const documentId = file.replace(/\.(md|markdown)$/, "");
      const content = readFileSync(join(dir, file), "utf8");
      return parseKnowledgeDocument(content, documentId);
    });
}
