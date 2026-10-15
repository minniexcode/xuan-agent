import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

/**
 * 本地 JSON 原子读写（technical-design.md §26.1）。
 * 写文件走「临时文件 + rename」，避免进程中断产生半写文件。
 */

export function writeJsonAtomic(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, JSON.stringify(value, null, 2), "utf8");
  renameSync(tmp, path);
}

/** 文件不存在返回 undefined；JSON 解析失败向上抛出（由调用方映射为 STORAGE_ERROR）。 */
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

export function removeFile(path: string): void {
  rmSync(path, { force: true });
}

export function removeDir(path: string): void {
  rmSync(path, { recursive: true, force: true });
}
