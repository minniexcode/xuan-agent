export interface SafetyAudit {
  warnings: string[];
  blocked: boolean;
}

interface ForbiddenPattern {
  pattern: RegExp;
  label: string;
}

/**
 * 输出审计初版：扫描断言式/恐吓式表达。系统 Prompt 是主防线，这里是事后兜底（§8）。
 * 命中时降级（记 warnings + blocked），不静默吞掉。
 */
const FORBIDDEN: ForbiddenPattern[] = [
  { pattern: /大凶|大劫|血光|必死/, label: "恐吓式表达" },
  { pattern: /注定|必然|一定会|绝对会|必定|铁口直断/, label: "断言式表达" },
  { pattern: /必发财|必破财|必离婚|必升官/, label: "断言式表达" },
];

export class SafetyGuard {
  auditOutput(text: string): SafetyAudit {
    const warnings: string[] = [];
    for (const { pattern, label } of FORBIDDEN) {
      if (pattern.test(text)) warnings.push(label);
    }
    const unique = [...new Set(warnings)];
    return { warnings: unique, blocked: unique.length > 0 };
  }
}
