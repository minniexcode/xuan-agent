import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

/**
 * Atomic local JSON read/write (technical-design.md §26.1).
 * Writes go to a temp file and then `rename`, so an interrupted process cannot
 * leave a half-written file behind.
 */
export function writeJsonAtomic(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, JSON.stringify(value, null, 2), "utf8");
  // rename is atomic on the same filesystem, so readers only ever see the old or the new file.
  renameSync(tmp, path);
}

/** Returns undefined when the file is missing; a JSON parse failure propagates (the caller maps it to STORAGE_ERROR). */
export function readJson<T>(path: string): T | undefined {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw err;
  }
  return JSON.parse(raw) as T;
}

/** Delete a single file; missing file is ignored. */
export function removeFile(path: string): void {
  rmSync(path, { force: true });
}

/** Recursively delete a directory; missing path is ignored. */
export function removeDir(path: string): void {
  rmSync(path, { recursive: true, force: true });
}
