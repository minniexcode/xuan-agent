# 玄枢（xuan-agent）技术设计文档

## 文档信息

- 状态：Draft
- 产品中文名：玄枢
- 英文项目名：`xuan-agent`
- 文档定位：技术设计文档（承接产品架构文档，覆盖工程蓝图、契约、类型、流程、测试与里程碑）
- 上游文档：`product-architecture.md`
- 版本范围：V1 / Personal Tool Validation
- 章节编号：沿用产品架构文档原第 14–30 章（自第 14 章起）

---

## 14. 详细工程蓝图

本章承接产品架构文档，把 V1 的工程边界落到技术设计层面。实现者应优先按本技术设计文档落地，只有框架选型和极少数库级细节（待定项见产品架构文档第 5.2 节）留待后续确定。

### 14.1 工程形态

V1 采用单包工程：

```text
xuan-agent/
  package.json
  tsconfig.json
  README.md
  LICENSE
  .env.example
  src/
    index.ts
    cli/
    api/
    agent/
    workflows/
    skills/
    providers/
    calculators/
    rag/
    memory/
    profiles/
    prompts/
    safety/
    config/
    logging/
    schemas/
    storage/
    errors/
    utils/
  knowledge/
    seed/
  examples/
  tests/
```

V1 不使用 monorepo。只有当后续出现独立前端、独立插件市场或多个 npm 包时，才升级为 workspace。

### 14.2 目录职责

| 目录 | 职责 | 是否公开 API |
| --- | --- | --- |
| `src/index.ts` | SDK 主导出入口。 | 是 |
| `src/cli/` | CLI 参数解析、命令注册、结果渲染。 | 否 |
| `src/api/` | HTTP API adapter，供后续服务模式使用。 | 否 |
| `src/agent/` | `XuanAgent`、Agent facade、请求路由。 | 部分 |
| `src/workflows/` | LangGraph.js workflow 定义。 | 否 |
| `src/skills/` | V1 Skills 与 SkillRegistry。 | 部分 |
| `src/providers/` | ProviderFactory 和 LangChain.js adapters。 | 部分 |
| `src/calculators/` | `BaziCalculator` 与 `lunar-typescript` adapter。 | 部分 |
| `src/rag/` | 知识库加载、chunk、embedding、检索、引用格式化。 | 部分 |
| `src/memory/` | 会话级状态、checkpoint store。 | 否 |
| `src/profiles/` | 本地用户档案 CRUD。 | 部分 |
| `src/prompts/` | Prompt 模板、版本、渲染。 | 否 |
| `src/safety/` | 安全策略、输入检查、输出检查。 | 否 |
| `src/config/` | `.env`、运行参数、默认配置合并。 | 部分 |
| `src/logging/` | 脱敏日志。 | 否 |
| `src/schemas/` | TypeScript 类型与运行时 schema。 | 部分 |
| `src/storage/` | 本地路径、文件读写、JSON 原子写入。 | 否 |
| `src/errors/` | 标准错误码和错误对象。 | 部分 |
| `knowledge/seed/` | V1 最小知识库种子。 | 包含在包内 |
| `examples/` | CLI/SDK 示例。 | 否 |
| `tests/` | 单元、集成、样例、smoke 测试。 | 否 |

### 14.3 推荐目录细化

```text
src/
  index.ts
  cli/
    main.ts
    commands/
      bazi.ts
      rag.ts
      provider.ts
      profile.ts
      config.ts
    renderers/
      text-renderer.ts
      json-renderer.ts
  api/
    create-server.ts
    routes/
      bazi.routes.ts
      followup.routes.ts
      profile.routes.ts
      provider.routes.ts
  agent/
    xuan-agent.ts
    agent-context.ts
    request-router.ts
  workflows/
    bazi.workflow.ts
    followup.workflow.ts
    provider-compare.workflow.ts
    state.ts
  skills/
    registry.ts
    manifest.ts
    bazi/
      index.ts
      bazi.skill.ts
      bazi.prompts.ts
    rag-reference/
      rag-reference.skill.ts
    profile-memory/
      profile-memory.skill.ts
    provider-compare/
      provider-compare.skill.ts
  providers/
    provider-factory.ts
    provider.types.ts
    langchain/
      openai-compatible.adapter.ts
      anthropic.adapter.ts
  calculators/
    bazi-calculator.ts
    lunar-typescript-calculator.ts
    bazi-normalizer.ts
  rag/
    rag-engine.ts
    document-loader.ts
    chunker.ts
    embedding-provider.ts
    vector-store.ts
    citation-formatter.ts
  memory/
    conversation-state.ts
    checkpointer.ts
    memory-store.ts
  profiles/
    profile-store.ts
    profile-service.ts
  prompts/
    prompt-manager.ts
    templates/
      bazi-beginner.md
      bazi-advanced.md
      followup.md
      safety.md
  safety/
    safety-guard.ts
    safety-rules.ts
    output-auditor.ts
  config/
    config.ts
    env.ts
    defaults.ts
  logging/
    logger.ts
    redaction.ts
  schemas/
    bazi.schema.ts
    analysis.schema.ts
    provider.schema.ts
    profile.schema.ts
    skill.schema.ts
  storage/
    paths.ts
    json-store.ts
    atomic-write.ts
  errors/
    xuan-error.ts
    error-codes.ts
```

## 15. npm Package 契约

### 15.1 `package.json` 目标形态

V1 的 `package.json` 应表达以下契约：

```json
{
  "name": "xuan-agent",
  "version": "0.1.0",
  "description": "Five Arts AI Agent for BaZi exploration.",
  "type": "module",
  "bin": {
    "xuan": "./dist/cli/main.js"
  },
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./schemas": {
      "types": "./dist/schemas/index.d.ts",
      "import": "./dist/schemas/index.js"
    }
  },
  "files": [
    "dist",
    "knowledge/seed",
    "README.md",
    "LICENSE"
  ],
  "engines": {
    "node": ">=20"
  }
}
```

技术设计阶段可以调整构建工具，但不得改变以下产品契约：

- 包必须提供 `xuan` CLI。
- 包必须提供 SDK 主入口。
- 包不得把内部目录作为默认公开 API。
- 包不得发布用户隐私数据和本地运行数据。

### 15.2 scripts 契约

V1 至少需要以下脚本：

```json
{
  "scripts": {
    "build": "build command decided in technical design",
    "typecheck": "tsc --noEmit",
    "test": "unit and integration tests",
    "test:fixtures": "bazi fixture tests",
    "test:smoke": "cli and sdk smoke tests",
    "lint": "lint command decided in technical design",
    "pack:dry": "npm pack --dry-run"
  }
}
```

发布前必须执行：

```bash
npm run typecheck
npm test
npm run test:fixtures
npm run test:smoke
npm run build
npm run pack:dry
```

### 15.3 包内资源策略

Prompt 模板可以随包发布。知识库只发布最小 seed，不发布完整私有知识库。

包内资源加载规则：

- 默认从包内 `knowledge/seed` 加载最小知识库。
- 用户可以通过配置指定本地知识库目录。
- 本地知识库优先级高于包内 seed。
- 本地向量索引默认写到用户数据目录，不写入项目源码目录。

## 16. 运行时配置与本地路径

### 16.1 配置优先级

配置合并顺序从低到高：

1. 包内默认值。
2. 用户级配置文件。
3. 项目级 `.env`。
4. CLI 参数。
5. SDK 调用时显式传入的 options。

高优先级配置覆盖低优先级配置。

### 16.2 `.env` 字段

V1 推荐支持：

```text
XUAN_PROVIDER=openai-compatible
XUAN_MODEL=deepseek-chat
XUAN_API_KEY=...
XUAN_BASE_URL=https://api.deepseek.com/v1
XUAN_TEMPERATURE=0.4
XUAN_ENABLE_VISION=false
XUAN_ENABLE_STREAMING=true
XUAN_PROFILE_DIR=
XUAN_KNOWLEDGE_DIR=
XUAN_LOG_LEVEL=info
```

Provider 专属 key 可扩展：

```text
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
DEEPSEEK_API_KEY=
```

规则：

- API key 不得打印。
- `config doctor` 只显示 key 是否存在，不显示 key 内容。
- Vision 相关命令必须检查 Provider capability。

### 16.3 本地路径

V1 默认使用用户数据目录，不把运行数据写进 npm 包目录。

建议逻辑路径：

```text
<user-data-dir>/xuan-agent/
  config.json
  profiles/
    default.json
  sessions/
    <session-id>.json
  rag/
    index/
    documents/
  logs/
    xuan.log
```

实际跨平台路径由技术设计阶段选定的 app data helper 决定。

## 17. 类型与 Schema 详细草案

V1 应使用 TypeScript 类型 + 运行时 schema 双层约束。运行时 schema 工具留到技术设计阶段，但下列字段语义应固定。

### 17.1 通用枚举

```ts
export type OutputMode = "beginner" | "advanced" | "both";
export type CalendarType = "solar" | "lunar";
export type Gender = "male" | "female" | "unspecified";
export type XiangshuType = "face" | "palm";
export type ProviderName =
  | "anthropic"
  | "openai"
  | "deepseek"
  | "openai-compatible";
```

### 17.2 `BirthInput`

```ts
export interface BirthInput {
  date: string;
  time?: string;
  timeUnknown?: boolean;
  gender: Gender;
  place?: string;
  calendar: CalendarType;
  useTrueSolarTime?: boolean;
  mode?: OutputMode;
}
```

约束：

- `date` 必须是无歧义日期，推荐 `YYYY-MM-DD`。
- `time` 和 `timeUnknown` 二选一。
- `calendar` 必填。
- `gender` 必填；不愿提供时可用 `unspecified`，但大运顺逆应标记受限。
- V1 默认 `useTrueSolarTime=false`。

### 17.3 `BaziChart`

```ts
export interface BaziChart {
  source: {
    library: "lunar-typescript" | string;
    version?: string;
    generatedAt: string;
  };
  input: BirthInput;
  pillars: {
    year: Pillar;
    month: Pillar;
    day: Pillar;
    hour?: Pillar;
    hourStatus: "known" | "unknown" | "unsupported";
  };
  dayMaster: HeavenlyStem;
  hiddenStems: Record<string, HeavenlyStem[]>;
  fiveElements: FiveElementDistribution;
  tenGods: TenGodRelation[];
  solarTerms?: SolarTermInfo;
  luckPillars?: LuckPillar[];
  annualFortune?: AnnualFortune[];
  symbolicStars?: SymbolicStar[];
  limitations: string[];
}
```

规则：

- `limitations` 必须记录不确定时辰、真太阳时未启用、流派差异等限制。
- `hourStatus=unknown` 时不得生成具体时柱。
- 如果第三方库无法提供某字段，应显式标记缺失或 unsupported，不得由 LLM 补全。

### 17.4 `AnalysisRequest`

```ts
export interface AnalysisRequest {
  sessionId?: string;
  userId?: string;
  skill: string;
  mode: OutputMode;
  question?: string;
  provider?: ProviderName;
  model?: string;
  saveToProfile?: boolean;
  temporary?: boolean;
}
```

### 17.5 `AnalysisResult`

```ts
export interface AnalysisResult<TStructured = unknown> {
  id: string;
  sessionId: string;
  skill: string;
  provider: {
    name: ProviderName;
    model: string;
  };
  mode: OutputMode;
  structured: TStructured;
  content: {
    summary: string;
    sections: AnalysisSection[];
    followupQuestions: string[];
    disclaimer: string;
  };
  citations: RagCitation[];
  safety: {
    boundaryApplied: boolean;
    warnings: string[];
    blocked: boolean;
  };
  metadata: {
    createdAt: string;
    durationMs?: number;
    promptVersion?: string;
    ragUsed: boolean;
  };
}
```

### 17.6 `XuanError`

```ts
export type XuanErrorCode =
  | "VALIDATION_ERROR"
  | "CALCULATION_ERROR"
  | "PROVIDER_CONFIG_ERROR"
  | "PROVIDER_CAPABILITY_ERROR"
  | "LLM_ERROR"
  | "RAG_NO_RESULT"
  | "PROFILE_PERMISSION_REQUIRED"
  | "SAFETY_BLOCKED"
  | "STORAGE_ERROR";

export interface XuanErrorShape {
  code: XuanErrorCode;
  message: string;
  stage: string;
  recoverable: boolean;
  details?: Record<string, unknown>;
}
```

## 18. SDK 详细契约

### 18.1 `createXuanAgent`

```ts
export function createXuanAgent(options?: XuanAgentOptions): XuanAgent;
```

`XuanAgentOptions` 支持：

- `config`
- `providerFactory`
- `skillRegistry`
- `memoryStore`
- `profileStore`
- `ragEngine`
- `logger`

所有 options 都可选。未传入时使用默认本地实现。

### 18.2 `XuanAgent` 方法

```ts
export interface XuanAgent {
  analyzeBazi(input: BirthInput, request?: Partial<AnalysisRequest>): Promise<AnalysisResult<BaziChart>>;
  askFollowup(input: FollowupInput): Promise<AnalysisResult>;
  compareProviders(input: ProviderCompareInput): Promise<ProviderCompareResult>; // V1 后
  searchRag(input: RagSearchInput): Promise<RagSearchResult>;
  getProfile(userId?: string): Promise<UserProfile | null>;
  saveProfile(profile: UserProfile, options?: SaveProfileOptions): Promise<UserProfile>;
  deleteProfile(userId?: string): Promise<void>;
  getConfigSummary(): Promise<ConfigSummary>;
}
```

规则：

- SDK 不直接要求用户理解 LangChain 或 LangGraph。
- SDK 返回结构化结果，不只返回纯文本。
- SDK 方法失败时抛出或返回标准 `XuanError`，技术设计阶段统一异常策略。

## 19. CLI 详细契约

### 19.1 命令矩阵

| 命令 | 必填参数 | 可选参数 | 输出 |
| --- | --- | --- | --- |
| `xuan bazi analyze` | `--date`、`--gender`、`--calendar`、`--time` 或 `--time-unknown` | `--place`、`--mode`、`--provider`、`--model`、`--json`、`--save-profile` | 八字结构化摘要 + 解读（默认 `advanced`） |
| `xuan bazi ask` | `--session`、`--question` | `--mode`、`--provider`、`--json` | 同盘追问结果 |
| `xuan rag search` | `--query` | `--skill`、`--top-k`、`--json` | 引用列表 |
| `xuan provider list` | 无 | `--json` | Provider 能力表 |
| `xuan profile view` | 无 | `--user`、`--json` | 用户档案 |
| `xuan profile save` | 视保存内容而定 | `--user`、`--confirm` | 保存结果 |
| `xuan profile delete` | 无 | `--user`、`--confirm` | 删除结果 |
| `xuan config doctor` | 无 | `--json` | 配置健康检查 |

`xuan xiangshu analyze`（相术）与 `xuan provider compare`（多 Provider 对比）为 V2 / V1 完成后能力，V1 不交付。

### 19.2 CLI 输出模式

CLI 默认输出人类可读文本，`--json` 输出 `AnalysisResult` 或对应结构化对象。八字分析默认输出模式为 `advanced`（便于开发者核验排盘与依据），`--mode beginner` 可切换通俗模式。

规则：

- 默认文本输出必须包含 Provider、模型、Skill、排盘来源。
- `--json` 不应混入非 JSON 文本。
- 错误输出必须包含错误码和可恢复建议。
- API key 和敏感输入必须脱敏。

### 19.3 用户确认

以下动作必须确认：

- 保存长期用户档案。
- 删除用户档案。
- 发送图片给云端 Provider。
- 使用非默认知识库目录。

`--yes` 或 `--confirm` 可跳过交互确认，但 CLI 必须在输出中记录该动作。

## 20. HTTP API 详细契约

HTTP API 不是 V1 主入口，也不是 V1 交付物，仅在仓库保留骨架；V1 交付 CLI 与 SDK。架构必须确保 HTTP API 复用 SDK，而非直接访问 Provider、RAG、ProfileStore 或排盘库。

建议未来 API adapter 暴露（V1 不交付）：

| Method | Path | 能力 |
| --- | --- | --- |
| `POST` | `/v1/bazi/analyze` | 创建八字分析 |
| `POST` | `/v1/followup` | 发起追问 |
| `GET` | `/v1/profile` | 查询档案 |
| `PUT` | `/v1/profile` | 更新档案 |
| `DELETE` | `/v1/profile` | 删除档案 |
| `GET` | `/v1/config/summary` | 查看脱敏配置 |
| `GET` | `/v1/health` | 健康检查 |

`/v1/xiangshu/analyze`（相术）与 `/v1/providers/compare`（多 Provider 对比）为 V2 / V1 完成后能力。

规则：

- HTTP API 不做公开 SaaS 鉴权设计。
- API 层只做参数校验、文件接收、调用 SDK 和响应格式化。
- API 不直接访问 Provider、RAG、ProfileStore 或排盘库。
- Streaming 可在技术设计阶段选择 SSE 或 chunked response。

## 21. LangGraph Workflow 详细设计

### 21.1 统一状态

```ts
export interface WorkflowState {
  requestId: string;
  sessionId: string;
  userId?: string;
  skill: string;
  mode: OutputMode;
  provider?: ProviderName;
  model?: string;
  input: unknown;
  chart?: BaziChart;
  imageObservation?: XiangshuObservation;
  citations: RagCitation[];
  prompt?: RenderedPrompt;
  llmOutput?: unknown;
  result?: AnalysisResult;
  errors: XuanErrorShape[];
  safetyWarnings: string[];
}
```

### 21.2 八字 workflow 节点

```text
validate_birth_input
  -> load_profile_preferences
  -> calculate_bazi_chart
  -> decide_rag_need
  -> retrieve_rag
  -> render_prompt
  -> apply_prompt_safety
  -> call_llm
  -> audit_output
  -> build_analysis_result
  -> save_conversation_state
  -> maybe_update_profile
```

硬性规则：

- `calculate_bazi_chart` 失败时终止，不进入 `call_llm`。
- `retrieve_rag` 无命中时继续，但写入无依据说明。
- `audit_output` 发现安全问题时应重写、降级或阻断。

### 21.3 相术 workflow 节点（V2）

V2 实现，V1 不包含。节点如下：

```text
validate_image_input
  -> inspect_image_file
  -> check_vision_capability
  -> privacy_notice
  -> load_profile_preferences
  -> render_vision_prompt
  -> apply_prompt_safety
  -> call_vision_llm
  -> audit_output
  -> build_analysis_result
  -> save_conversation_state
```

硬性规则（V2）：

- Provider 不支持 Vision 时终止。
- 图片不可读时终止。
- `audit_output` 必须检查身份识别、敏感属性、疾病判断、外貌价值评判。

### 21.4 追问 workflow 节点

```text
load_conversation_state
  -> classify_followup
  -> load_frozen_context
  -> maybe_retrieve_rag
  -> render_followup_prompt
  -> call_llm
  -> audit_output
  -> build_analysis_result
  -> update_conversation_state
```

硬性规则：

- 八字追问必须复用已保存的 `BaziChart`。
- Provider 切换只改变 LLM 调用，不改变排盘输入。
- 找不到会话上下文时返回明确错误。

## 22. Provider 架构详细设计

V1 主用 `openai-compatible` adapter（DeepSeek 等 OpenAI 兼容 Provider 走此 adapter），`anthropic` 保留为骨架；其余 adapter 留待后续接入。Provider 抽象保持一致，业务层不绑定单一 Provider。

### 22.1 Provider capability

```ts
export interface ProviderCapabilities {
  text: boolean;
  vision: boolean;
  streaming: boolean;
  structuredOutput: boolean;
  toolCalling: boolean;
}
```

### 22.2 Provider adapter

```ts
export interface LlmProvider {
  name: ProviderName;
  model: string;
  capabilities: ProviderCapabilities;
  invokeText(input: TextLlmInput): Promise<LlmTextOutput>;
  invokeVision(input: VisionLlmInput): Promise<LlmVisionOutput>;
  streamText?(input: TextLlmInput): AsyncIterable<LlmTextChunk>;
}
```

ProviderFactory 负责：

- 读取 ProviderConfig。
- 检查必填配置。
- 创建 LangChain.js model 实例。
- 包装为统一 `LlmProvider`。
- 暴露 capability。

规则：

- 新增 Provider 不得改 Skill。
- Vision capability 为 false 时不得进入相术 Skill。
- Provider 错误必须映射为标准 `XuanError`。
- Base URL Provider 统一走 openai-compatible adapter。

## 23. Skill Manifest 详细设计

### 23.1 Manifest 结构

```ts
export interface SkillManifest<I = unknown, O = unknown> {
  name: string;
  version: string;
  description: string;
  inputSchema: unknown;
  outputSchema: unknown;
  requiredCapabilities: {
    llmText?: boolean;
    llmVision?: boolean;
    rag?: boolean;
    memory?: boolean;
    profile?: boolean;
    deterministicCalculation?: boolean;
  };
  safetyRules: string[];
  execute(context: SkillContext, input: I): Promise<O>;
}
```

### 23.2 V1 Skill 责任边界

| Skill | 可做 | 不可做 |
| --- | --- | --- |
| `bazi` | 校验出生信息、调用 `BaziCalculator`、组织八字解读。 | 直接让 LLM 排盘。 |
| `rag-reference` | 检索资料、格式化引用。 | 伪造来源或把古籍当最终裁决。 |
| `profile-memory` | 管理显式授权的档案。 | 默认保存敏感信息。 |
| `provider-compare` | （V1 后）复用同一输入并列输出不同模型结果。 | 修改排盘或 RAG 证据。 |

## 24. RAG 文件格式与索引设计

### 24.1 知识库源文件

V1 seed 知识库建议使用 Markdown + frontmatter：

```md
---
id: bazi-ten-gods-zhengyin
title: 正印
domain: bazi
tags: [十神, 正印, 学习, 支持]
source_name: 示例资料
source_type: curated-note
copyright_status: usable
---

## 原文或整理文本

...

## 现代释义

...
```

### 24.2 chunk 元数据

```ts
export interface KnowledgeChunk {
  id: string;
  documentId: string;
  title: string;
  domain: "bazi" | "face" | "palm" | "general";
  tags: string[];
  sourceName: string;
  sourceType: string;
  copyrightStatus: "usable" | "unknown" | "restricted";
  text: string;
  interpretation?: string;
}
```

规则：

- `copyrightStatus=unknown` 或 `restricted` 不进入正式核心知识库。
- RAG 返回必须携带 source metadata。
- 用户本地知识库可以覆盖或扩展 seed。

### 24.3 检索策略

V1 检索流程：

```text
normalize query
  -> keyword prefilter
  -> vector search if index available
  -> merge and rerank
  -> filter by domain and copyright status
  -> return RagCitation[]
```

如果向量索引不可用，V1 应降级到关键词检索，并在 metadata 标记检索模式。

## 25. Prompt 架构

### 25.1 Prompt 分类

V1 Prompt 至少分为：

- `system-safety`
- `bazi-beginner`
- `bazi-advanced`
- `bazi-followup`
- `provider-compare`（V1 后）
- `rag-citation-summary`

（`xiangshu-beginner`、`xiangshu-advanced` 为 V2 相术 Prompt。）

### 25.2 Prompt 输入

Prompt 渲染必须显式传入：

- 用户问题。
- 输出模式。
- 结构化排盘或图像观察输入。
- RAG 引用。
- 用户偏好。
- 安全边界。
- Provider 名称和模型。

Prompt 不得只传自然语言生日描述给 LLM。

### 25.3 Prompt 版本

每个 Prompt 模板必须有版本号。`AnalysisResult.metadata.promptVersion` 记录实际使用版本，便于多 Provider 对比和回归测试。

## 26. 存储设计

### 26.1 JSON store

本地 JSON 写入必须满足：

- 写入前 schema 校验。
- 原子写入，避免进程中断导致文件损坏。
- 读失败时返回 `STORAGE_ERROR`。
- 删除档案时删除对应本地文件。

### 26.2 会话状态

会话状态保存：

- 当前 Skill。
- 最近一次输入摘要。
- `BaziChart` 或相术观察摘要。
- Provider 和模型。
- 输出模式。
- RAG 命中摘要。
- 安全警告。

会话状态不应保存完整图片二进制。

### 26.3 用户档案

用户档案只保存用户确认的摘要和偏好，不保存完整私密对话。

建议字段：

- `id`
- `nickname`
- `preferences`
- `birthInfo`
- `analysisSummaries`
- `notes`
- `createdAt`
- `updatedAt`

## 27. 测试矩阵

### 27.1 单元测试

| 模块 | 测试重点 |
| --- | --- |
| `BaziCalculator` | 输入校验、四柱映射、不确定时辰、错误处理。 |
| `ProviderFactory` | 配置读取、capability、缺失 key、Base URL。 |
| `RagEngine` | 文档加载、chunk、检索、无命中降级。 |
| `SafetyGuard` | 禁止词、身份识别、敏感属性、断言式输出。 |
| `ProfileStore` | 保存、读取、更新、删除、临时模式。 |
| `SkillRegistry` | 注册、重复注册、失败隔离。 |

### 27.2 集成测试

| 场景 | 验证 |
| --- | --- |
| 八字分析 | 生成 `BaziChart` 后再进入 LLM。 |
| 八字追问 | 同一 session 复用同一盘。 |
| Provider 对比（V1 后） | 同一输入传给多个 Provider。 |
| RAG 引用 | 引用区分原文、释义和总结。 |
| 档案保存 | 未确认不写入，确认后写入。 |

### 27.3 fixture 测试

排盘 fixture 必须覆盖：

- 公历日期。
- 农历日期。
- 节气边界。
- 子时边界。
- 不确定时辰。
- 性别影响的大运方向。
- 真太阳时关闭。

fixture 来源必须记录，不能只写期望结果而无依据。

### 27.4 smoke 测试

发布前 smoke test：

```bash
xuan config doctor --json
xuan provider list --json
xuan rag search --query "正印" --json
xuan bazi analyze --date 1995-03-12 --time 08:30 --gender male --calendar solar --json
```

SDK smoke test：

```ts
import { createXuanAgent } from "xuan-agent";

const agent = createXuanAgent({ config: { provider: "mock" } });
await agent.getConfigSummary();
```

## 28. 实施里程碑

### 28.1 Milestone 1：包骨架

完成：

- `package.json`
- TypeScript build
- CLI 入口
- SDK 入口
- 基础类型和错误码
- `config doctor`

### 28.2 Milestone 2：八字最小闭环

完成：

- `BaziCalculator`
- `lunar-typescript` adapter
- `BaziChart`
- `xuan bazi analyze`
- mock Provider 解读
- 排盘 fixture 测试

### 28.3 Milestone 3：Provider 与 Prompt

完成：

- ProviderFactory
- 至少一个真实文本 Provider
- PromptManager
- SafetyGuard 初版
- 通俗 / 进阶模式

### 28.4 Milestone 4：RAG 与追问

完成：

- seed 知识库
- RagEngine
- `xuan rag search`
- ConversationState
- `xuan bazi ask`

### 28.5 Milestone 5：相术与 Vision（移至 V2）

V1 不包含相术。图像输入校验、Vision capability、`xiangshu-face`、`xiangshu-palm`、相术安全审计整体移至 V2 里程碑。V1 的收尾工作见 Milestone 6。

### 28.6 Milestone 6：npm 预发布

完成：

- README
- `.env.example`
- smoke tests
- `npm pack --dry-run`
- 包内容审计
- `0.1.0` 预发布准备

## 29. PRD 需求映射

| PRD 需求 | 架构承载 |
| --- | --- |
| FR-BAZI-01 出生信息采集 | `BirthInput`、CLI/API/SDK validation。 |
| FR-BAZI-02 确定性排盘 | `BaziCalculator`、`BaziChart`、排盘样例集。 |
| FR-BAZI-03 通俗模式解读 | `bazi` Skill、PromptManager、SafetyGuard。 |
| FR-BAZI-04 进阶模式解读 | `bazi` Skill、RagEngine、RagCitation。 |
| FR-BAZI-05 追问与同盘复用 | ConversationState、LangGraphWorkflow、MemoryStore。 |
| FR-MEM-01 对话级记忆 | LangGraph checkpointer、ConversationState、MemoryStore。 |
| FR-MEM-02 用户档案级记忆 | UserProfile、ProfileStore、本地 JSON。 |
| FR-RAG-01 知识库内容管理 | Local knowledge base、RagEngine、source metadata。 |
| FR-RAG-02 检索与引用 | RagCitation、RagEngine、PromptManager。 |
| FR-LLM-01 Provider 配置 | ProviderConfig、ConfigManager。 |
| FR-LLM-02 Provider 工厂与统一调用 | ProviderFactory、LangChain.js adapter。 |
| FR-LLM-03 多 Provider 对比（V1 后） | provider-compare Skill、frozen input reuse。 |
| FR-SKILL-01 V1 Skills 注册 | SkillManifest、SkillRegistry。 |
| FR-SKILL-02 后续扩展规则 | Skill interface、Foundation Layer reuse。 |

## 30. 后续技术设计输入

本技术设计文档还需补齐以下代码级实现与选型细节（框架选型待定项见产品架构文档第 5.2 节）：

- 最终选择 CLI 框架、HTTP API 框架、构建工具、schema 工具、测试框架和向量存储。
- 写出具体 `package.json`、`tsconfig.json`、构建配置和发布脚本。
- 定义完整 TypeScript type、runtime schema 和错误响应对象。
- 明确每个 CLI 命令的参数名、默认值、退出码和输出格式。
- 明确 HTTP API 的请求、响应、文件上传、streaming 和错误码。
- 写出 LangGraph.js workflow 的具体节点函数、边、checkpoint 配置和状态 reducer。
- 写出 LangChain.js Provider adapter 的具体依赖、模型初始化和 mock provider。
- 验证 `lunar-typescript` API，并完成 `BaziChart` 字段映射表。
- 设计 RAG chunk size、embedding provider、vector store 和 index rebuild 命令。
- 落地 Prompt 模板文件、版本号策略和回归测试样例。
- 落地 SafetyGuard 的规则表、测试样例和输出审计策略。
- 建立排盘 fixture 来源、期望输出和自动化验证命令。
