import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { ConversationStore } from "../../src/conversations/index.js";
import { createXuanAgent } from "../../src/index.js";
import { createLogger } from "../../src/logging/index.js";
import { RagEngine } from "../../src/rag/index.js";

const root = mkdtempSync(join(tmpdir(), "xuan-followup-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

const sessionsDir = join(root, "sessions");
const seedDir = join(root, "seed");
mkdirSync(seedDir, { recursive: true });
writeFileSync(
  join(seedDir, "zhengyin.md"),
  [
    "---",
    "id: zhengyin",
    "title: 正印",
    "domain: bazi",
    "tags: [十神, 正印]",
    "source_name: 示例资料",
    "source_type: curated-note",
    "copyright_status: usable",
    "---",
    "",
    "## 原文或整理文本",
    "正印为生我之异性者，主学业、长辈、庇护。",
    "",
    "## 现代释义",
    "正印代表学习力与被支持。",
  ].join("\n"),
  "utf8",
);

const silent = createLogger("silent");

function makeAgent() {
  return createXuanAgent({
    config: { provider: "mock" },
    logger: silent,
    conversationStore: new ConversationStore(sessionsDir),
    ragEngine: new RagEngine({ seedDir }),
  });
}

describe("XuanAgent 追问（mock Provider）", () => {
  it("analyze 自动写入会话，ask 复用同一份盘面", async () => {
    const agent = makeAgent();
    const analyzed = await agent.analyzeBazi({
      date: "1995-03-12",
      time: "08:30",
      gender: "male",
      calendar: "solar",
    });

    const followup = await agent.askFollowup({
      sessionId: analyzed.sessionId,
      question: "什么是正印？",
    });

    expect(followup.sessionId).toBe(analyzed.sessionId);
    expect(followup.structured.dayMaster).toBe(analyzed.structured.dayMaster);
    expect(followup.structured.pillars.year.ganZhi).toBe(analyzed.structured.pillars.year.ganZhi);
  });

  it("术语追问触发 RAG 引用，风格类追问不触发", async () => {
    const agent = makeAgent();
    const analyzed = await agent.analyzeBazi({
      date: "1995-03-12",
      time: "08:30",
      gender: "male",
      calendar: "solar",
    });

    const term = await agent.askFollowup({ sessionId: analyzed.sessionId, question: "正印是什么" });
    expect(term.metadata.ragUsed).toBe(true);
    expect(term.citations.length).toBeGreaterThan(0);

    const style = await agent.askFollowup({ sessionId: analyzed.sessionId, question: "说人话" });
    expect(style.metadata.ragUsed).toBe(false);
    expect(style.citations).toEqual([]);
  });

  it("不传 sessionId 时续最近一次会话", async () => {
    const agent = makeAgent();
    const analyzed = await agent.analyzeBazi({
      date: "1995-03-12",
      time: "08:30",
      gender: "male",
      calendar: "solar",
    });

    const followup = await agent.askFollowup({ question: "为什么日主是壬水？" });
    expect(followup.sessionId).toBe(analyzed.sessionId);
  });

  it("找不到会话上下文时抛 STORAGE_ERROR", async () => {
    const empty = createXuanAgent({
      config: { provider: "mock" },
      logger: silent,
      conversationStore: new ConversationStore(join(root, "empty")),
    });
    await expect(empty.askFollowup({ question: "任意问题" })).rejects.toMatchObject({
      code: "STORAGE_ERROR",
    });
  });
});
