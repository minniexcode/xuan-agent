import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { type ConversationState, ConversationStore } from "../../src/conversations/index.js";

const dir = mkdtempSync(join(tmpdir(), "xuan-sess-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

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

describe("ConversationStore", () => {
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
