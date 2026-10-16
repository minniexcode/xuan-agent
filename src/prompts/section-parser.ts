import type { AnalysisSection } from "../schemas/analysis.js";

/** Parsed interpretation: a summary plus titled sections and follow-up questions. */
export interface ParsedSections {
  summary: string;
  sections: AnalysisSection[];
  followupQuestions: string[];
}

/** A Markdown `## 标题` line (only H2 is a section boundary, matching the prompt instruction). */
const HEADING = /^##\s+/;
/** The agreed heading whose bullets become follow-up questions (must match `sectionsInstruction`). */
const FOLLOWUP_TITLE = "可继续追问";

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
    // Only the exact agreed heading is a question list — an arbitrary heading that
    // merely contains "追问" (e.g. "追问解答") is a normal section, so its body is
    // never dropped.
    if (currentTitle === FOLLOWUP_TITLE) {
      const leftovers: string[] = [];
      for (const line of currentBody) {
        const bullet = line.trim().match(/^[-*•]\s+(.+)$/);
        if (bullet?.[1] !== undefined) followupQuestions.push(bullet[1].trim());
        else leftovers.push(line);
      }
      // Bullet-free text under the follow-up heading is kept rather than discarded.
      const rest = leftovers.join("\n").trim();
      if (rest !== "") sections.push({ title: currentTitle, body: rest });
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
