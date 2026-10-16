import { isAbsolute, relative, resolve } from "node:path";
import { XuanError } from "../errors/index.js";

/**
 * Reject identifiers that could escape their storage directory (path traversal).
 * Applied to profile and session ids before they are joined into a file path
 * (PRD privacy / local-storage boundary).
 */
export function assertSafeId(id: string, dir: string, label: string): void {
  if (id.trim() === "" || id === "." || id === "..") {
    throw new XuanError({
      code: "VALIDATION_ERROR",
      message: `${label}不合法`,
      stage: "input",
      recoverable: true,
    });
  }
  // A single path component cannot contain separators; rejecting them here means
  // `join(dir, id + ".json")` can never reach outside `dir`.
  if (id.includes("/") || id.includes("\\")) {
    throw new XuanError({
      code: "VALIDATION_ERROR",
      message: `${label}不得包含路径分隔符`,
      stage: "input",
      recoverable: true,
    });
  }
  // Defense in depth: even with the checks above, verify the resolved target
  // still lands inside `dir`.
  const rel = relative(resolve(dir), resolve(dir, `${id}.json`));
  if (rel === "" || rel.startsWith("..") || isAbsolute(rel)) {
    throw new XuanError({
      code: "VALIDATION_ERROR",
      message: `${label}超出存储目录`,
      stage: "input",
      recoverable: true,
    });
  }
}
