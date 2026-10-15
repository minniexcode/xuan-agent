/** Outcome of scanning model output: matched warning labels, and whether to block. */
export interface SafetyAudit {
  warnings: string[];
  blocked: boolean;
}

interface ForbiddenPattern {
  pattern: RegExp;
  label: string;
}

/**
 * First-cut output audit: scans for assertive / fear-mongering phrasing. The system
 * prompt is the primary defence; this is the post-hoc backstop (product-architecture.md §8).
 * A hit degrades the result — records warnings and sets `blocked` — rather than silently
 * swallowing the output.
 */
const FORBIDDEN: ForbiddenPattern[] = [
  { pattern: /大凶|大劫|血光|必死/, label: "恐吓式表达" },
  { pattern: /注定|必然|一定会|绝对会|必定|铁口直断/, label: "断言式表达" },
  { pattern: /必发财|必破财|必离婚|必升官/, label: "断言式表达" },
];

/** Post-hoc output scanner; see the `FORBIDDEN` table above for what it flags. */
export class SafetyGuard {
  /** Scan `text`; dedupes matched labels and blocks when any remain. */
  auditOutput(text: string): SafetyAudit {
    const warnings: string[] = [];
    for (const { pattern, label } of FORBIDDEN) {
      if (pattern.test(text)) warnings.push(label);
    }
    const unique = [...new Set(warnings)];
    return { warnings: unique, blocked: unique.length > 0 };
  }
}
