# 05 · 测试与 Review

> [导览索引](README.md) · 上一份 ← [04-编排与入口](04-编排与入口.md) · 下一份 → [06-Vision 接入点](06-Vision接入点.md)

**第 12 站**：测试怎么读。然后是**这份导览最重要的部分——Review 检查清单**。

---

## 第 12 站：测试怎么读

```text
tests/
  fixtures/bazi-baseline.json    21 例排盘基线（数据）
  fixtures/baseline.test.ts      经 BaziCalculator 断言（防回归）
  unit/                          12 个文件的单元测试
  smoke/cli.test.ts              CLI 端到端（含 --json 纯净性）
  smoke/sdk.test.ts              SDK 冒烟
```

**`fixtures/baseline.test.ts` 最值得读**，它体现了排盘测试的完整思路：

- 基线覆盖：公历 / 农历 / 闰月 / 节气边界 / 晚子时 / 大运顺逆。
- 注释明确写了 **"防回归，不用于证明正确性"** —— 正确性由三实现交叉对拍确认（§11 of `product-architecture.md`）。这个区分很重要：基线只能告诉你"变了"，不能告诉你"对了"。
- 断言走 `BaziCalculator` 而非直接调 `tyme4ts` —— 换库时测试不用改。

**`unit/followup.test.ts` 值得读**，它是唯一验证"同盘复用"的测试：断言 `ask` 返回的 `structured` 与 `analyze` 完全一致。

跑单个测试文件：

```bash
npx vitest run tests/unit/rag.test.ts
npx vitest run tests/fixtures        # 只跑回归基线
npm run test:smoke                   # 只跑冒烟
```

---

## Review 检查清单

按"值得你重点判断"的顺序排列。**前 3 项是规格与实现的真实差距，不是 bug，但需要你决定是否接受。**

### 1. `content.sections` 恒为空 ⚠️

`requirements.md` 的 FR-BAZI-03/04 要求"输出**结构化 section**，非自由文本"，验收标准写着"输出可被 CLI 按 section 渲染"。但 `xuan-agent.ts:112` 的 `toResult()` 里 `sections: []` 是写死的，LLM 返回的文本整个塞进 `summary`。

**现状**：CLI 渲染的是自由 markdown 文本，可读性其实不错。**差距**：没有 section 结构，通俗/进阶模式的 section 清单（关键词 / 整体摘要 / 观察点…）没有真正落地。

**修法**：让 LLM 输出 JSON（`structuredOutput` 能力已预留），或在 PromptManager 里约定 markdown 标题并由渲染器切分。这是 V1 收尾最实质的一个缺口。

### 2. SkillRegistry / Skill Manifest 未实现

`technical-design.md` §23 定义了 `SkillManifest`（`name` / `description` / `inputSchema` / `outputSchema` / `requiredCapabilities` / `safetyRules` / `execute`）。实际代码里 **Skill 是隐含的** —— 就是 `XuanAgent` 上的方法，`AnalysisResult.skill` 是硬编码的 `"bazi"`。

**我的判断**：V1 只有 bazi 一个真 Skill，注册表的价值要等第二个 Skill 进来才体现。但如果 V2 相术要作为独立 Skill 接入，**这一步迟早要做**，且越早做改动越小。

### 3. RAG 检索词是启发式拼的

`xuan-agent.ts:103` 的 `searchChartCitations()` 用"日主 + 十神"拼查询词：

```ts
const terms = [chart.dayMaster, ...chart.tenGods.map((r) => r.tenGod)];
```

**实跑证据见 [01 快照第 ④ 步](01-全局.md#34-跟着真实数据走一遍实跑快照)**：4 条命中里 3 条只命中了 `壬` 一个字（正印/壬水/调候三篇都提到"壬水"），真正精准的只有"伤官"那条。查询词里的"十神"（正官/比肩/食神）**一条都没命中** —— 因为知识库里没有对应条目，而 `壬` 这个字的区分度太低。

**结论**：不是语义检索，命中质量高度依赖知识库标签和查询词的重合度。知识库一变大，噪声会迅速上升。修法有两条：给查询词加权重（日主低于十神），或换向量检索（`RagSearchResult.mode` 字段已预留降级标记）。

### 4. 晚子时流派只有默认值，没有切换入口

`ADR-0010` 说"做成可切换（`LunarHour.provider`）"，但代码里没有暴露这个开关，`limitations` 里写的是"（School B，可切换）"——**可切换是文档承诺，代码还没给入口**。V1 个人自用无妨，但这是一处文档与代码的不一致。

### 5. CLI 有一处越层调用 ⚠️

`src/cli/commands/session.ts` 直接 `import { ConversationStore }` 并 `new ConversationStore(...)`，**绕过了 `XuanAgent`**。这违反"CLI 不直接调用存储"的分层铁律（`CLAUDE.md` / §14.2），而且 `ConversationStore` 并不在 SDK 导出列表里 —— 它是内部模块。

**修法**：在 `XuanAgent` 上加 `clearSessions(sessionId?)`，CLI 改调它。（`config doctor` 不在此列 —— 它用的是 `diagnoseConfig`/`resolveConfig`，这两个**是** SDK 公开导出。）

### 6. SafetyGuard 词表偏短

三条正则覆盖了最主要的断言式表达，但 §8 列的禁止项还包括"医疗/法律/投资/婚育建议""身份识别""敏感属性推断"等，这些**目前只靠系统 Prompt 兜底**，没有事后审计。V1 够用；V2 相术加入后（图像 → 身份/敏感属性风险）这块必须补。

### 7. 大运 8 步、流年未实现

`FR-BAZI-02` 的输出字段清单里有"**流年：默认最近 10 年**"，但 `BaziChart` 里**没有流年字段**，`technical-design.md` 的 `BaziChart` 定义里也没有。大运是 8 步（`LUCK_STEPS = 8`），符合要求。

**判断**：这更像"需求清单与类型设计不一致"——是文档该改，还是代码该补，需要你定。

---

## 附：快速上手命令

```bash
npm install
npm run typecheck && npm run lint && npm test    # 全绿说明环境 OK
npm run build
node dist/cli/main.js bazi analyze --date 1995-03-12 --time 08:30 --gender male --calendar solar
node dist/cli/main.js bazi ask --question "什么是正印？"
node dist/cli/main.js rag search --query "正印"
node dist/cli/main.js config doctor
```

要真实 LLM 输出，需要在 `.env` 里配 `XUAN_API_KEY`（`.env.example` 有模板）。不想花钱就把 `XUAN_PROVIDER=mock` —— 除了 LLM 文本是占位符，**其余链路完全一样**。

---

> 下一份 → [06-Vision 接入点](06-Vision接入点.md)：V2 准备
