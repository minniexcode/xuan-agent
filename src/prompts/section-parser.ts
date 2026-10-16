import type { AnalysisSection } from "../schemas/analysis.js";

/** Parsed interpretation: a summary plus titled sections and follow-up questions. */
export interface ParsedSections {
  summary: string;
  sections: AnalysisSection[];
  followupQuestions: string[];
}

/** A Markdown `## 标题` line (only H2 is a section boundary, matching the prompt instruction). */
const HEADING = /^##\s+/;

/**
 * Split a Markdown interpretation into sections on `## 标题` boundaries.
 * Text before the first heading becomes `summary`; the `可继续追问` section's bullet
 * lines become `followupQuestions`. When no heading exists the whole text degrades to
 * `summary` with empty sections — a plain answer never breaks the result (happy-path fallback).
 */
export function parseSections(text: string): ParsedSections {
  const trimmed = text.trim();
  if (trimmed === "") return { summary: "", sections: [], followupQuestions: [] };

  const summary: string[] = [];
  const sections: AnalysisSection[] = [];
  const followupQuestions: string[] = [];
  let currentTitle: string | null = null;
  let currentBody: string[] = [];

  const flush = () => {
    if (currentTitle === null) return;
    const body = currentBody.join("\n").trim();
    if (currentTitle.includes("追问")) {
      for (const line of currentBody) {
        const bullet = line.trim().match(/^[-*•]\s+(.+)$/);
        if (bullet?.[1] !== undefined) followupQuestions.push(bullet[1].trim());
      }
    } else if (body !== "") {
      sections.push({ title: currentTitle, body });
    }
    currentTitle = null;
    currentBody = [];
  };

  for (const line of trimmed.split("\n")) {
    if (HEADING.test(line)) {
      flush();
      currentTitle = line.replace(HEADING, "").trim();
      currentBody = [];
    } else if (currentTitle !== null) {
      currentBody.push(line);
    } else {
      summary.push(line);
    }
  }
  flush();

  return { summary: summary.join("\n").trim(), sections, followupQuestions };
}
