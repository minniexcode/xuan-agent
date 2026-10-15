# 玄枢 V1 代码导览（渐进式阅读指南）

面向"要 review V1 代码"的读者。按**从外到内、从整体到细节**的顺序组织：先看全貌和依赖，再逐层读代码。

配套文档：产品意图看 [`prd.md`](prd.md) / [`requirements.md`](requirements.md)，设计契约看 [`technical-design.md`](technical-design.md)，决策理由看 [`adr.md`](adr.md)。**本文只讲"代码现在长什么样、为什么这么长"**，不重复产品需求。

---

## 0. 怎么用这份文档

三条路线，按你的时间选：

| 路线 | 读什么 | 耗时 |
| --- | --- | --- |
| **速览** | 第 1–3 站（全貌 + 依赖 + 架构与数据流） | ~15 分钟 |
| **完整 review** | 第 1–12 站顺序读 + 文末「Review 检查清单」 | ~1.5 小时 |
| **只为 Vision 做准备** | 第 3 站（数据流）+ 第 5/6/9 站（计算/Provider/Safety）+ 文末「Vision 接入点」 | ~40 分钟 |

V1 全部源码约 **2600 行 TypeScript**（不含测试），规模不大，值得通读。

---

## 1. 项目全貌

### 1.1 顶层结构

```text
xuan-agent/
├── src/              # 源码（2600 行）
├── tests/            # 测试：fixtures（回归基线）/ unit / smoke
├── knowledge/seed/   # 知识库种子（4 篇示例，随 npm 包发布）
├── docs/             # 产品与设计文档（唯一事实来源）
├── dist/             # 构建产物（gitignore）
├── .env / .env.example
├── CLAUDE.md         # 给 AI 协作者的仓库说明
├── GLOSSARY.md       # 领域术语表（中文）
└── tsup.config.ts / tsconfig.json / biome.json / package.json
```

### 1.2 源码分层与代码量

```text
src/
  index.ts              76    ← SDK 唯一公开出口
  cli/                 505    ← 入口层：命令注册 + 渲染
  agent/               338    ← 编排层：XuanAgent（核心）
  calculators/         163    ← 计算层：BaziCalculator + tyme4ts adapter
  providers/           252    ← Provider 层：LlmProvider + Factory + adapters
  rag/                 301    ← RAG 层：文档加载 + 关键词检索
  conversations/       134    ← 会话状态 + 本地存储
  profiles/             56    ← 用户档案存储
  prompts/             100    ← Prompt 模板（版本化）
  safety/               32    ← 输出审计
  schemas/             229    ← 类型与 zod 运行时校验
  config/              181    ← 配置解析与诊断
  storage/              72    ← 路径解析 + JSON 原子读写
  logging/              80    ← 脱敏日志
  errors/               74    ← 标准错误码与错误对象
```

### 1.3 各目录一句话职责

| 目录 | 职责 | 依赖谁 |
| --- | --- | --- |
| `cli/` | commander 命令注册、结果渲染（中文） | 只经 `agent` + SDK 公开出口 |
| `agent/` | **唯一编排点**：串起校验→排盘→RAG→Prompt→LLM→审计→存储 | 下面所有层 |
| `calculators/` | 确定性排盘，隔离第三方库 | `schemas` |
| `providers/` | LLM 调用抽象，隔离具体服务方 | `schemas` / `errors` |
| `rag/` | 知识库加载 + 关键词检索 + 引用组装 | `schemas` |
| `conversations/` | 会话状态（同盘复用的载体） | `storage` / `schemas` |
| `profiles/` | 用户档案 CRUD | `storage` / `schemas` |
| `prompts/` | 版本化 Prompt 构建 | `schemas` |
| `safety/` | 输出事后审计（断言式表达扫描） | 无 |
| `schemas/` | 类型 + zod schema，全项目共享 | `zod` |
| `config/` | `.env` → `XuanConfig`，配置诊断 | `schemas` / `storage` |
| `storage/` | 路径解析 + JSON 原子写 | 无 |
| `logging/` | stderr 脱敏日志 | 无 |
| `errors/` | `XuanError` + 错误码枚举 | 无 |

---

## 2. 依赖

### 2.1 运行时依赖（只有 3 个）

| 包 | 版本 | 为什么是它 |
| --- | --- | --- |
| `tyme4ts` | ^1.5.3 | 八字排盘。节气用寿星天文历算法，经三实现交叉对拍验证（[ADR-0003](adr.md)）。**被 `BaziCalculator` 完全隔离**，业务层看不到它 |
| `zod` | ^4.6.7 | 运行时校验 + 类型推导。`z.infer` 让 schema 和 TS 类型单一来源，避免手写两遍 |
| `commander` | ^15.0.0 | CLI 参数解析。零依赖、API 稳定 |

### 2.2 开发依赖

| 包 | 用途 |
| --- | --- |
| `typescript` ^5.9.3 | **刻意停在 5.9**：TS 7.x 移除了 compiler API，`tsup` 的 `.d.ts` 打包器（rollup-plugin-dts）会报 `requires the TypeScript compiler API` |
| `tsup` ^9 | 基于 esbuild 的打包器，输出 ESM + 类型声明 |
| `vitest` ^5 | 测试。与 vite 同源，原生 ESM/TS 支持，无需编译步骤 |
| `@biomejs/biome` ^2.5 | 格式化 + lint（一个工具替代 prettier + eslint） |
| `@types/node` ^26 | Node 类型 |

### 2.3 刻意**没有**的依赖

- **LangChain.js / LangGraph.js** —— 曾在设计里，V1 明确不引入（[ADR-0011](adr.md)）。理由：V1 流程是**线性的**（没有分支图、没有并行、没有细粒度 checkpoint），LangGraph 的图编排用不上；自研 `LlmProvider` 抽象只有 ~100 行，已覆盖需求。少一个重依赖，行为更可预期。
- **向量数据库 / embedding 库** —— V1 用关键词检索，见第 7 站。
- **Python** —— 不进入 V1 依赖。

---

## 3. 架构与数据流

### 3.1 分层与依赖方向（铁律）

```text
   Entry 层          src/cli/*   src/index.ts（SDK）
                          │
                          ▼
   Orchestration 层  src/agent/xuan-agent.ts
                          │
                          ▼
   Foundation 层     calculators · providers · rag · conversations
                     profiles · prompts · safety · config · storage
                     logging · errors · schemas
```

**铁律**（`CLAUDE.md` 与 §14.2 的规定）：

1. `src/index.ts` 是**唯一公开 API**，内部模块不是 SDK 契约的一部分。
2. **业务层不得直接使用 `tyme4ts` 原始对象**，只能经 `BaziCalculator` 返回的 `BaziChart`。
3. CLI 不得直接调用排盘库 / RAG / 存储，必须经 `XuanAgent`。

> ⚠️ 第 3 条有**一处已知偏离**，见文末检查清单第 5 项。

### 3.2 完整数据流 A：`xuan bazi analyze`

这是 V1 的主链路，跟着它读一遍就能理解全项目：

```text
1. src/cli/main.ts           loadEnvFile(".env") → 构建 commander 程序
2. src/cli/commands/bazi.ts  解析参数 → createXuanAgent() → agent.analyzeBazi()
3. src/config/config.ts      resolveConfig()：.env + DEFAULTS → XuanConfig
4. src/agent/xuan-agent.ts:154  analyzeBazi()
   ├─ BirthInputSchema.safeParse()      校验；失败抛 VALIDATION_ERROR
   ├─ calculator.calculate()            → BaziChart（纯计算，不碰 LLM）
   ├─ searchChartCitations()            :103  进阶模式才做，RAG 检索引用
   ├─ promptManager.buildBaziPrompt()   → system + user 消息 + 版本号
   ├─ provider.invokeText()             → LLM 文本
   ├─ safetyGuard.auditOutput()         → warnings / blocked
   └─ conversationStore.save()          除非 temporary:true
5. src/cli/renderers/          渲染成中文文本，或 --json 原样输出
```

关键点：**第 4 步里 LLM 只出现在最后**。盘面在进 LLM 之前就已经算完了。

### 3.3 完整数据流 B：`xuan bazi ask`（同盘追问）

```text
src/agent/xuan-agent.ts:212  askFollowup()
  ├─ 取会话：有 --session 就 load(id)，否则 loadLatest()
  │    └─ 拿不到 chart → 抛 STORAGE_ERROR（明确报错，不猜）
  ├─ ragEngine.search(question)      按需检索：命中术语才有引用
  ├─ promptManager.buildFollowupPrompt(chart, question, mode, citations)
  │    └─ chart 来自会话，**不重新排盘**
  ├─ provider.invokeText() → safetyGuard.auditOutput()
  └─ 更新会话状态（记录本轮 question + ragHits）
```

对比 A 和 B：A 是"出生信息 → 盘面"，B 是"已有盘面 → 追问"。**盘面是两者共享的不变量**，这就是"同盘复用"的实现方式。

---

## 4. 第 1 层：地基

建议阅读顺序：`errors` → `logging` → `storage` → `schemas` → `config`。

### 4.1 `errors/` —— 全项目统一的失败表达

- `XUAN_ERROR_CODES`（`error-codes.ts`）：9 个错误码的联合类型，**穷举**而非自由字符串。
- `XuanError`（`xuan-error.ts`）：带 `code` / `stage` / `recoverable` / `details` 的结构化错误。
- `XuanError.from(err, fallback)`：把任意异常收敛成 `XuanError`，原始信息塞进 `details.cause`。

**为什么**：CLI、SDK、未来的 HTTP API 需要**同一种**错误形状。`recoverable` 让调用方知道该重试还是该改输入。

### 4.2 `logging/` —— 脱敏是设计的一部分

- `createLogger(level)`：写 **stderr**，保证 `--json` 时 stdout 是纯 JSON（这是个容易踩的坑，测试里有覆盖）。
- `redaction.ts`：`isSecretKey()` 用正则匹配 `api_key|secret|token|...`；`redactObject()` 递归替换成 `***`。**只返回占位符，不泄露长度或前后缀**。

**为什么**：日志里出现完整 API key 或出生信息是不可接受的（§8.3）。所以脱敏做在 logger 内部，而不是靠调用方自觉。

### 4.3 `storage/` —— 原子写 + 路径解析

- `paths.ts`：`resolvePaths()` 按平台给出数据目录（Windows 用 `%APPDATA%`），派生出 `profiles/` `sessions/` `logs/`。**运行数据一律不写进 npm 包目录。**
- `json-store.ts`：`writeJsonAtomic()` 写临时文件再 `rename`（避免进程中断产生半写文件）；`readJson()` 文件不存在返回 `undefined`，其余异常向上抛。

**为什么**：`rename` 在同一文件系统内是原子的，这是"不产生损坏文件"最省事的做法。

### 4.4 `schemas/` —— 类型与校验的单一来源

四个文件：`index.ts`（通用枚举 + `BirthInput`）、`bazi.ts`（盘面类型）、`analysis.ts`（结果类型）、`profile.ts`（档案类型）。

`BirthInputSchema` 值得细读：

```ts
.refine((v) => (v.time === undefined) !== (v.timeUnknown === undefined), {
  message: "time 与 timeUnknown 必须二选一",
})
```

这行保证"要么给时间、要么声明不知道"，不能两者都给或都不给。

**注意 `BirthInputSchema` 与 `BirthInputRequest` 的区别**：`BirthInput`（`z.infer`，输出类型，默认值已填充）vs `BirthInputRequest`（`z.input`，调用方传入的形式，可选字段可省略）。这个区分贯穿全项目。

`analysis.ts` 里的 `AnalysisResult<TStructured>` 是**泛型**的——这是 V2 相术能复用的关键（见文末）。

### 4.5 `config/` —— 配置优先级

- `DEFAULTS`（`defaults.ts`）：包内默认值，优先级最低。
- `resolveConfig(env)`：`.env` 值 → 校验 Provider 名 → 合并默认值 → `XuanConfig`。**注意 `resolveConfig` 接受 `env` 参数**（默认 `process.env`），这是为了测试能注入假环境变量。
- `getConfigSummary()` / `diagnoseConfig()`：脱敏摘要与健康检查。**`apiKeyPresent: boolean`，永远不返回 key 本身**（测试里有断言）。

`loadEnvFile()`（`env.ts`）是零依赖的 `.env` 解析器，约 20 行。**已存在的环境变量优先，不被文件覆盖**。

---

## 5. 第 2 层：计算（`calculators/`）

### 5.1 接口（10 行，但很重要）

```ts
export interface BaziCalculator {
  readonly source: { library: string; version: string };
  calculate(input: BirthInput): BaziChart;
}
```

整个业务层只认这两个成员。**换库 = 换一个实现类**，其他代码一行不动。

### 5.2 `Tyme4tsBaziCalculator`（`tyme4ts-calculator.ts`）

这是全项目**唯一**接触 `tyme4ts` 的文件。三个函数：

| 函数 | 干什么 | 注意点 |
| --- | --- | --- |
| `resolveSolarTime()` :36 | 公历/农历 → `SolarTime` | 闰月用**负月份**表示（`-4` = 闰四月）；时辰未知时回退 `12:00` 只为拿到日柱 |
| `toPillar()` :24 | `SixtyCycle` → `Pillar` | 一次性取出天干/地支/藏干/纳音，之后不再碰库对象 |
| `countFiveElements()` :52 | 统计五行 | 只数**可见的** 4 天干 + 4 地支（各计 1），不含藏干 |

`calculate()` :65 的流程：解析时间 → `getEightChar()` → 转四柱 → 算十神（日主对四柱天干）→ 统计五行 → 排大运（8 步）→ 收集 `limitations`。

**`limitations` 是设计的重点**：时辰未知、晚子时流派、未启用真太阳时、性别缺失，都会在这里明示。这是"不静默选边"原则的落地。

大运部分注意 `if (input.gender !== "unspecified")` —— 性别未指定就不排大运，并记一条 limitation。

---

## 6. 第 3 层：Provider（`providers/`）

四个文件，是"多 Provider 可切换"的全部实现。

### 6.1 抽象（`provider.types.ts`）

```ts
export interface LlmProvider {
  name: ProviderName;
  model: string;
  capabilities: ProviderCapabilities;   // text / vision / streaming / structuredOutput / toolCalling
  invokeText(input: TextLlmInput): Promise<LlmTextOutput>;
}
```

`ProviderCapabilities.vision` **现在恒为 false**，但字段已预留 —— 这是 Vision 的接入点之一。

### 6.2 实现

- `mock.adapter.ts`：25 行，返回固定文本。**所有单元测试都用它**，不花 API 费用、不依赖网络。
- `openai-compatible.adapter.ts`：直接 `fetch` `/chat/completions`。两个实战坑写在注释里：
  - **`x-opencode-session` 头是必需的**（opencode.ai 网关没有它会返回 400 `MissingSessionID`）。
  - 推理模型有 `reasoning_content` 会吃掉 token 预算，所以 `max_tokens` 默认给足 16000，最终答案取 `choices[0].message.content`。
  - 非 2xx 响应把 status 和 body 前 500 字塞进 `XuanError.details`，便于排查。

### 6.3 工厂（`provider-factory.ts`）

```ts
export const ProviderFactory = { create(config) { switch (config.provider) { ... } } };
```

`anthropic` 分支**故意抛错**（"尚未实现（V1 骨架）"），而不是假装可用 —— 明确失败优于静默降级。

`provider-catalog.ts` 是给 `xuan provider list` 用的静态能力表，与工厂解耦（列能力不需要实例化 Provider）。

---

## 7. 第 4 层：RAG（`rag/`）

V1 是**关键词检索**，没有向量索引、没有 embedding。三个文件：

### 7.1 `document-loader.ts` —— 知识库格式

知识库是 **markdown + frontmatter**（见 `knowledge/seed/*.md`）。`parseFrontmatter()` 是约 20 行的零依赖解析器（只支持平铺键值，不解析嵌套 YAML）。

`splitSections()` 按 `## ` 标题把正文分成"原文"和"现代释义"两段 —— 对应 FR-RAG-02 要求引用区分**原文 / 释义 / 总结**。

`loadKnowledgeDir()` 目录不存在时**返回空数组**（本地知识库是可选的，不是错误）。

### 7.2 `rag-engine.ts` —— 检索策略

`scoreChunk()` :54 的打分是这里最值得读的部分，因为中文术语检索和英文很不一样：

```ts
// 反向命中：标签/标题是否出现在 query 里
if (q.includes(t) || t.includes(q)) score += 40;
```

为什么需要"反向"？因为用户问的是 **"什么是正印"**，而知识条目标题是 **"正印"**。正向匹配（query 是否出现在文本里）会因为多出的"什么是"而失配；所以判断"标题是否被 query 包含"。这是 V1 中文检索能用的关键技巧。

`load()` :126 做了两件重要的事：
1. **合并 seed 与本地知识库**，同 id 时本地覆盖 seed（FR-RAG-01）。
2. **过滤 `copyrightStatus !== "usable"` 的条目** —— 版权不明的资料不进核心知识库。

无命中时返回空数组，**不伪造出处**（FR-RAG-02 的硬性要求）。

---

## 8. 第 5 层：记忆（`conversations/` + `profiles/`）

### 8.1 `conversations/` —— 同盘复用的载体

`ConversationState`（`conversation-state.ts`）存：`sessionId` / `skill` / `question` / **`chart`** / `mode` / `provider` / `model` / `ragHits` / `safetyWarnings`。

**`chart` 是整个追问机制的核心**：`ask` 读它，不重新排盘。

`ConversationStore`（`conversation-store.ts`）用 `<sessionId>.json` + 一个 `latest.json` 指针实现"续最近一次会话"。四个方法：`save` / `load` / `loadLatest` / `clear`。

**存储策略是刻意的取舍**：FR-MEM-01 说"每次 analyze 后**自动**写入会话（追问依赖它，必须存）"，而 §8.3 说"默认不持久化出生信息"。两条约束的调和方式是：`analyze` 默认存本地会话（否则追问没法用），但 SDK 可以传 `temporary: true` 完全跳过。会话文件落在本地 user-data-dir，`xuan session clear` 可清。

### 8.2 `profiles/` —— 显式授权的长期档案

`ProfileStore` 与 `ConversationStore` 结构几乎一样（本地 JSON + 原子写）。差别在**权限**：`saveProfile` / `deleteProfile` 必须 `{ confirm: true }`，否则抛 `PROFILE_PERMISSION_REQUIRED`。这个闸门做在 `XuanAgent` 里（`xuan-agent.ts:283`），不在 CLI —— 这样 SDK 调用方也受同样约束。

`saveProfile` 里有个细节：更新时保留 `createdAt`，只刷新 `updatedAt`。

---

## 9. 第 6 层：Prompt 与 Safety

### 9.1 `prompts/prompt-manager.ts`

- `SAFETY_SYSTEM`：中性、非断言的系统 Prompt。**这是安全的第一道防线**（输出审计是兜底）。
- `modeInstruction()`：通俗模式"少术语"vs 进阶模式"直接使用专业术语"。
- `buildBaziPrompt(chart, mode, citations)` :45：进阶模式**且**有引用时才插入 RAG 文本；通俗模式不引古籍。
- `buildFollowupPrompt(chart, question, mode, citations)` :72：追问专用，带上"本轮沿用，不重新排盘"的说明。
- 每个 Prompt 返回 `version`（如 `bazi-advanced-v0`），写进 `AnalysisResult.metadata.promptVersion`。

**为什么 Prompt 用内联模板而非模板文件**：V1 只有两个模板，内联让"模板 + 版本号"在同一个地方可见，改起来不会漏。§25.3 要求的版本号已经落地。

### 9.2 `safety/safety-guard.ts`（30 行）

`auditOutput(text)` 用三条正则扫描输出：恐吓式（大凶/大劫/血光）、断言式（注定/必然/一定会）、断言式财婚（必发财/必离婚）。

返回 `{ warnings, blocked }`，**命中时降级而非静默吞掉**。

注意这是**事后兜底**，主防线是系统 Prompt。词表很短，V1 阶段够用；真要扩充，这里是最直接的改动点。

---

## 10. 第 7 层：编排（`agent/xuan-agent.ts`，338 行）

**这是全项目的枢纽**，建议最后读、读最细。

### 10.1 工厂与依赖注入

`createXuanAgent(options)` :76 是工厂函数（不是 class）。所有依赖都可以注入：

```ts
options.calculator | provider | ragEngine | conversationStore | profileStore | logger | config
```

**为什么用工厂 + 注入而不是 class**：测试可以塞 mock（`tests/unit/*` 全靠这个），不需要 monkey-patch。

**惰性创建**是刻意的：

```ts
let provider = options.provider;
const getProvider = (): LlmProvider => { provider ??= ProviderFactory.create(config); return provider; };
```

`config doctor` 不需要 Provider，这样它就不会因为缺 API key 而失败。`ragEngine` 则直接创建（无副作用）。

### 10.2 六个公开方法

| 方法 | 行 | 说明 |
| --- | --- | --- |
| `getConfigSummary()` | :150 | 脱敏配置 |
| `analyzeBazi()` | :154 | 主链路，见 §3.2 |
| `askFollowup()` | :212 | 同盘追问，见 §3.3 |
| `searchRag()` | :274 | 直通 `ragEngine.search()` |
| `getProfile()` / `saveProfile()` / `deleteProfile()` | :278/283/326 | 档案，带 `--confirm` 闸门 |

`toResult()` :112 是私有辅助函数，把所有链路统一组装成 `AnalysisResult`，避免三处重复。

### 10.3 读这一层时注意

- **参数校验用 `safeParse` 而非 `parse`**，为的是把 zod 的 issue 列表转成中文 `XuanError`（`analyzeBazi` 开头）。
- `satisfies ConversationState` 出现在 `askFollowup` 里 —— 用 `satisfies` 而非类型断言，保留字面量类型的同时做检查。
- `content.sections` 目前**恒为 `[]`**，见文末检查清单第 1 项。

---

## 11. 第 8 层：入口（`cli/` + `index.ts`）

### 11.1 `cli/`

```text
main.ts       ← 加载 .env，parseAsync，统一错误出口（非零退出码）
program.ts    ← buildProgram()：注册所有命令，无副作用（便于测试）
commands/     ← 每个命令一个文件：bazi / rag / session / profile / provider / config
renderers/    ← 每个命令一个渲染器：中文文本输出
```

**`buildProgram()` 不产生副作用**是关键设计：测试可以直接 `buildProgram().parseAsync([...])` 断言输出，不需要 spawn 子进程。

命令清单：`bazi analyze|ask`、`rag search`、`session clear`、`profile view|save|delete`、`provider list`、`config doctor`。

渲染器与命令分离，`--json` 走 `json-renderer`（就是 `JSON.stringify(value, null, 2)`），保证 stdout 纯净。

### 11.2 `index.ts`（76 行）

SDK 的唯一出口，全部是 `export type {...}` / `export {...}` 转发。**读一遍这个文件就知道公开 API 的全貌**。

注意：`conversations/`、`profiles/`（Store 类）、`storage/`、`logging/` **不在**导出列表里 —— 它们是内部实现。

---

## 12. 测试怎么读

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

按"值得你重点判断"的顺序排列。前 3 项是**规格与实现的真实差距**，不是 bug，但需要你决定是否接受。

### 1. `content.sections` 恒为空 ⚠️

`requirements.md` 的 FR-BAZI-03/04 要求"输出**结构化 section**，非自由文本"，验收标准写着"输出可被 CLI 按 section 渲染"。但 `xuan-agent.ts:112` 的 `toResult()` 里 `sections: []` 是写死的，LLM 返回的文本整个塞进 `summary`。

**现状**：CLI 渲染的是自由 markdown 文本，可读性其实不错（见之前的实跑输出）。**差距**：没有 section 结构，通俗/进阶模式的 section 清单（关键词 / 整体摘要 / 观察点…）没有真正落地。

**修法**：让 LLM 输出 JSON（`structuredOutput` 能力已预留），或在 PromptManager 里约定 markdown 标题并由渲染器切分。这是 V1 收尾最实质的一个缺口。

### 2. SkillRegistry / Skill Manifest 未实现

`technical-design.md` §23 定义了 `SkillManifest`（`name` / `description` / `inputSchema` / `outputSchema` / `requiredCapabilities` / `safetyRules` / `execute`）。实际代码里 **Skill 是隐含的** —— 就是 `XuanAgent` 上的方法，`AnalysisResult.skill` 是硬编码的 `"bazi"`。

**我的判断**：V1 只有 bazi 一个真 Skill，注册表的价值要等第二个 Skill 进来才体现。但如果 V2 相术要作为独立 Skill 接入，**这一步迟早要做**，且越早做改动越小。

### 3. RAG 检索词是启发式拼的

`xuan-agent.ts:103` 的 `searchChartCitations()` 用"日主 + 十神"拼查询词：

```ts
const terms = [chart.dayMaster, ...chart.tenGods.map((r) => r.tenGod)];
```

实跑效果还行（能命中正印/伤官/壬水/调候）。但它**不是语义检索**，命中与否依赖知识库标签和这些词的重合度。知识库内容一多，这个策略可能要换成向量检索（`RagSearchResult.mode` 字段已经预留了降级标记）。

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

## Vision 接入点（为 V2 做准备）

你说 V1 review 通过后要做"V1 增强版，为 Vision 加入做准备"。好消息是**现有架构的预留比较充分**，主要工作不是重构而是填充。按改动从易到难：

### A. 已经预留好的（不用改）

| 位置 | 预留 |
| --- | --- |
| `ProviderCapabilities.vision` | 字段已在（`provider.types.ts:5`），恒 false |
| `AnalysisResult<TStructured>` | **泛型**，可直接装 `XiangshuObservation` |
| `RagCitation` / `KnowledgeDomain` | 已含 `"face" \| "palm"` 域 |
| `config.enableVision` | 配置项已在，`diagnoseConfig` 会警告"V1 不交付" |
| `technical-design.md` §21.3 | 相术 workflow 的完整节点图已写好 |

### B. 需要新增的

1. **`LlmProvider.invokeVision()`** —— §22.2 已定义签名，未实现。需要处理图片编码（base64 / data URL）与多模态消息格式。**注意**：现有 `TextLlmInput` 只支持纯文本消息，Vision 需要一个平行的 `VisionLlmInput`。
2. **图像输入校验** —— 文件可读性、格式、大小；`Provider.capabilities.vision === false` 时必须**终止**（§21.3 硬性规则）。
3. **`SafetyGuard` 图像规则** —— 身份识别、敏感属性推断、疾病判断、外貌价值评判。这是 V2 最大的新增风险面。
4. **新 Skill + workflow 节点** —— 按 §21.3 的 10 个节点（`validate_image_input` → … → `save_conversation_state`）。
5. **CLI `xuan xiangshu analyze`** —— 需要文件参数与 `--confirm`（"发送图片给云端 Provider"必须确认，§19.3）。
6. **`ConversationState`** —— 存"相术观察摘要"而非图片二进制（§26.2 明确）。

### C. 架构层面要提前想清楚的

- **Skill 抽象**：如果相术作为独立 Skill，检查清单第 2 项（SkillRegistry）就**必须先做**。这是 V2 前最值得投入的一次重构。
- **多模态 Provider 抽象**：现在的 `invokeText` 是单一方法。是加 `invokeVision`（平行方法）还是把 `messages` 泛化成 content block 数组（更通用但要改所有 adapter）？这个选择会影响后续所有 Provider。
- **`xuan-agent.ts` 的体积**：338 行已经不小，再加相术流程会明显膨胀。V2 前把 workflow 拆成 `src/workflows/`（目录在 §14.3 已规划）是合理时机。

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
