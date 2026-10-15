import { existsSync, readFileSync } from "node:fs";

/**
 * Minimal .env parser: zero dependencies, predictable behavior.
 * An already-set environment variable wins over the file and is never overwritten
 * (config precedence, technical-design.md §16.1).
 *
 * @param path Path to the .env file; missing file is a no-op.
 * @param env Target environment object (defaults to process.env).
 */
export function loadEnvFile(path: string, env: NodeJS.ProcessEnv = process.env): void {
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    // Skip blank lines and comments.
    if (line === "" || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (key === "") continue;
    let value = line.slice(eq + 1).trim();
    // Strip a single matching pair of surrounding quotes, if present.
    const quoted =
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"));
    if (quoted && value.length >= 2) value = value.slice(1, -1);
    // Only fill in variables that are not already set: environment wins over file.
    if (env[key] === undefined) env[key] = value;
  }
}
