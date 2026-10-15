import { join } from "node:path";
import { XuanError } from "../errors/index.js";
import { readJson, removeDir, removeFile, writeJsonAtomic } from "../storage/json-store.js";
import { type ConversationState, ConversationStateSchema } from "./conversation-state.js";

const LATEST_FILE = "latest.json";

/** 会话状态本地 JSON 存储：`<sessionsDir>/<sessionId>.json` + 最近指针。 */
export class ConversationStore {
  constructor(private readonly dir: string) {}

  private pathFor(sessionId: string): string {
    return join(this.dir, `${sessionId}.json`);
  }

  private latestPath(): string {
    return join(this.dir, LATEST_FILE);
  }

  async save(state: ConversationState): Promise<void> {
    const parsed = ConversationStateSchema.parse(state);
    try {
      writeJsonAtomic(this.pathFor(parsed.sessionId), parsed);
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

  /** 读取最近一次会话；无指针或文件缺失时返回 undefined。 */
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

  /** 不传 sessionId 时清空整个目录（FR-MEM-01 的 `xuan session clear`）。 */
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
