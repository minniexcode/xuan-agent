import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { type ConversationState, ConversationStore } from "../../src/conversations/index.js";

// Isolated temp directory: the store writes real session files, so tests must
// never touch the user's actual data directory.
const dir = mkdtempSync(join(tmpdir(), "xuan-sess-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

// Minimal valid ConversationState; overrides let each test vary only what it checks.
function state(overrides: Partial<ConversationState> = {}): ConversationState {
  return {
    sessionId: "sess-1",
    skill: "bazi",
    mode: "advanced",
    provider: "mock",
    model: "mock",
    ragHits: [],
    safetyWarnings: [],
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// Local session persistence for FR-MEM-01 (session memory / follow-up context).
describe("ConversationStore", () => {
  // Round-trip plus the "latest session" pointer that powers default follow-up.
  it("save 后 load 可读回，且指针指向最近会话", async () => {
    const store = new ConversationStore(dir);
    await store.save(state({ sessionId: "sess-1", mode: "beginner" }));

    const loaded = await store.load("sess-1");
    expect(loaded?.sessionId).toBe("sess-1");
    expect(loaded?.mode).toBe("beginner");

    const latest = await store.loadLatest();
    expect(latest?.sessionId).toBe("sess-1");
  });

  it("load 不存在的会话返回 undefined", async () => {
    const store = new ConversationStore(dir);
    expect(await store.load("nope")).toBeUndefined();
  });

  // Clearing one session must leave the others intact.
  it("clear(sessionId) 只清理指定会话", async () => {
    const store = new ConversationStore(dir);
    await store.save(state({ sessionId: "sess-a" }));
    await store.save(state({ sessionId: "sess-b" }));

    await store.clear("sess-a");
    expect(await store.load("sess-a")).toBeUndefined();
    expect(await store.load("sess-b")).toBeDefined();
  });

  it("clear() 清空目录", async () => {
    const store = new ConversationStore(dir);
    await store.save(state({ sessionId: "sess-c" }));
    await store.clear();
    expect(await store.loadLatest()).toBeUndefined();
  });
});
