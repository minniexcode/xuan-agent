import type { RagSearchResult } from "../../rag/types.js";

export function renderRagResult(result: RagSearchResult): string {
  const lines = ["知识库检索", "", `检索词：${result.query}`, `检索方式：关键词`];

  if (result.citations.length === 0) {
    lines.push("", "未检索到明确依据。");
    return lines.join("\n");
  }

  result.citations.forEach((citation, i) => {
    lines.push(
      "",
      `${i + 1}. ${citation.sourceName}（${citation.contentKind}）`,
      `   ${citation.excerpt}`,
    );
    if (citation.interpretation !== "") lines.push(`   释义：${citation.interpretation}`);
    if (citation.tags.length > 0) lines.push(`   标签：${citation.tags.join("、")}`);
  });

  return lines.join("\n");
}
