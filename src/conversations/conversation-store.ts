import { join } from "node:path";
import { XuanError } from "../errors/index.js";
import { readJson, removeDir, removeFile, writeJsonAtomic } from "../storage/json-store.js";
import { type ConversationState, ConversationStateSchema } from "./conversation-state.js";

const LATEST_FILE = "latest.json";

/**
 * Local JSON storage for conversation state: `<sessionsDir>/<sessionId>.json` plus a "latest" pointer.
 * The persisted state carries the frozen `chart`, which is what lets a follow-up reuse the same chart without re-calculation.
 */
export class ConversationStore {
  constructor(private readonly dir: string) {}

  /** File path for a single session's state. */
  private pathFor(sessionId: string): string {
    return join(this.dir, `${sessionId}.json`);
  }

  /** Path of the pointer file recording the most recent session. */
  private latestPath(): string {
    return join(this.dir, LATEST_FILE);
  }

  /** Validate and persist a session, then update the latest-session pointer. */
  async save(state: ConversationState): Promise<void> {
    const parsed = ConversationStateSchema.parse(state);
    try {
      // Atomic temp-file + rename (via writeJsonAtomic) avoids a half-written file on interruption (technical-design.md §26.1).
      writeJsonAtomic(this.pathFor(parsed.sessionId), parsed);
      // The pointer is what lets `ask` (with no explicit sessionId) resume the most recent session.
      writeJsonAtomic(this.latestPath(), { sessionId: parsed.sessionId });
    } catch (err) {
      throw XuanError.from(err, {
        code: "STORAGE_ERROR",
        message: "写入会话状态失败",
        stage: "storage",
        recoverable: false,
      });
    }
  }

  /** Load a session by id; returns undefined when the file is missing. */
  async load(sessionId: string): Promise<ConversationState | undefined> {
    try {
      const raw = readJson<unknown>(this.pathFor(sessionId));
      if (raw === undefined) return undefined;
      return ConversationStateSchema.parse(raw) as ConversationState;
    } catch (err) {
      throw XuanError.from(err, {
        code: "STORAGE_ERROR",
        message: `读取会话状态失败：${sessionId}`,
        stage: "storage",
        recoverable: false,
      });
    }
  }

  /** Load the most recent session; returns undefined when there is no pointer or the file is missing. */
  async loadLatest(): Promise<ConversationState | undefined> {
    try {
      const pointer = readJson<{ sessionId?: string }>(this.latestPath());
      if (pointer?.sessionId === undefined) return undefined;
      return await this.load(pointer.sessionId);
    } catch (err) {
      throw XuanError.from(err, {
        code: "STORAGE_ERROR",
        message: "读取最近会话失败",
        stage: "storage",
        recoverable: false,
      });
    }
  }

  /** Clear one session, or the whole directory when `sessionId` is omitted (FR-MEM-01's `xuan session clear`). */
  async clear(sessionId?: string): Promise<void> {
    try {
      if (sessionId !== undefined) {
        removeFile(this.pathFor(sessionId));
        const pointer = readJson<{ sessionId?: string }>(this.latestPath());
        if (pointer?.sessionId === sessionId) removeFile(this.latestPath());
      } else {
        removeDir(this.dir);
      }
    } catch (err) {
      throw XuanError.from(err, {
        code: "STORAGE_ERROR",
        message: "清理会话状态失败",
        stage: "storage",
        recoverable: false,
      });
    }
  }
}
