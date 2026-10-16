# 玄枢（xuan-agent）产品架构文档

## 文档信息

- 状态：Draft
- 产品中文名：玄枢
- 英文项目名：`xuan-agent`
- 文档定位：产品架构文档
- 上游文档：`xuan-agent-prd.md`
- 下游文档：技术设计文档（`technical-design.md`）
- 版本范围：V1 / Personal Tool Validation
- 主栈决策：TypeScript-first
- 交付形态：npm package，CLI + SDK 一体包

## 1. 架构结论

V1 采用 **TypeScript-first + npm package + CLI/SDK 一体** 的产品架构。

核心结论：

- V1 主栈使用 TypeScript，运行时面向 Node.js。
- npm 包名暂定 `xuan-agent`，发布前检查 npm registry 名称可用性。
- CLI 命令名使用 `xuan`。
- SDK 入口使用 `xuan-agent`，供 CLI、HTTP API、脚本和后续上层应用复用。
- Agent 编排与 LLM 抽象使用轻量自研层（`XuanAgent` 线性流程 + `LlmProvider`/`ProviderFactory`），V1 不引入 LangGraph.js / LangChain.js（ADR-0011）。
- 八字确定性排盘优先使用 `tyme4ts`，并通过 `BaziCalculator` 接口隔离具体排盘库。
- 相术（V2）使用 Vision-capable LLM，不引入额外 CV 模型。
- RAG、用户档案、会话状态和配置均本地优先。
- Python 不进入 V1 默认架构，只作为未来确定性计算能力不足时的后备 adapter 方向。

选择 TypeScript-first 的原因：

- 玄枢 V1 更像开发者工具型 Agent，而不是纯 AI/ML pipeline。
- CLI、SDK、插件化、npm 分发、MCP/IDE/桌面端扩展和 Web 集成都更贴近 TS/npm 生态。
- npm 包可同时承载命令行工具和可复用 SDK，便于个人使用、开源传播和后续集成。
- `tyme4ts` 作为 V1 八字计算库；排盘准确性已通过三实现交叉对拍验证（见 §11）。

## 2. 架构目标

产品架构需要承接 PRD 中的 V1 能力边界：

- 支撑八字命理核心能力（相术为 V2 扩展方向）。
- 保证确定性计算和 LLM 解读分离。
- 让 CLI、SDK 和 HTTP API 复用同一套核心能力。
- 支持 LLM Provider 可切换（多 Provider 对比为 V1 完成后能力）。
- 支持 RAG 引用、会话状态、用户档案和 Skill 扩展。
- 默认保护出生信息、出生地、用户档案、API key 和对话历史（相术图像为 V2）。
- 支持后续新增六爻、紫微、奇门、梅花等 Skill，而不重写核心 Agent 流程。

V1 不追求：

- 多用户 SaaS 权限体系。
- 完整前端页面。
- 商业化运营后台。
- 浏览器端完整 Agent runtime。
- 让 LLM 直接完成排盘、干支推导、身份识别或重大决策建议。

## 3. 总体架构

V1 采用单 npm 包、分层模块架构：

```text
User / Integrator
  |
  |-- CLI: xuan ...
  |-- SDK: import { createXuanAgent } from "xuan-agent"
  |-- HTTP API: future app/server integration
  |
Entry Layer
  |
  |-- CLI Adapter
  |-- SDK Public API
  |-- HTTP API Adapter
  |
Agent Orchestration Layer
  |
  |-- XuanAgent
  |-- AgentOrchestrator
  |-- LangGraphWorkflow
  |-- ConversationStateManager
  |
Skill Layer
  |
  |-- bazi
  |-- rag-reference
  |-- profile
  |-- provider-compare
  |
Foundation Layer
  |
  |-- BaziCalculator
  |-- ProviderFactory
  |-- RagEngine
  |-- ConversationStore
  |-- ProfileStore
  |-- PromptManager
  |-- SafetyGuard
  |-- ConfigManager
  |-- Logger
  |
Local Storage / External Providers
  |
  |-- .env / local config
  |-- local JSON profiles
  |-- local checkpoints
  |-- local knowledge base
  |-- local vector index
  |-- LLM Providers
```

### 3.1 入口层

入口层负责接收用户或上层系统输入，不承载核心业务逻辑。

- CLI 是 V1 主入口，适合本地个人使用、调试排盘、调试 Prompt 和管理档案。
- SDK 是所有核心能力的公开调用入口，CLI 和 HTTP API 都应调用 SDK。
- HTTP API 面向后续前端、桌面端、自动化工作流或第三方服务集成。

CLI 和 HTTP API 不直接调用排盘库、LangChain、RAG 或本地存储；这些能力必须通过 SDK / Agent core 进入。

### 3.2 编排层

编排层负责把一次用户请求转换成稳定流程：

- 识别用户入口和请求类型。
- 校验输入并选择 Skill。
- 加载会话状态和用户档案偏好。
- 调用确定性工具、RAG、Provider 和 Safety。
- 组织阶段式输出或 streaming 输出。
- 写入会话状态。
- 在用户显式确认后写入长期档案。

V1 的编排为自研线性流程（`XuanAgent`），不引入 LangGraph.js（ADR-0011）；有状态流程（八字追问、同盘复用、多 Provider 对比、会话 checkpoint）由自研 `ConversationStore` 承载。此处的 LangGraph.js 描述为历史设计，已由 ADR-0011 取代。

### 3.3 Skill 层

Skill 是可注册、可替换、可复用的业务能力单元。

V1 必须包含：

| Skill | 档位 | 说明 |
| --- | --- | --- |
| `bazi` | V1 交付 | 八字排盘与解读。 |
| `profile` | V1 交付 | 用户档案和偏好管理。 |
| `rag-reference` | 骨架 | 古籍、术语和知识库检索引用（内容待数据）。 |
| `provider-compare` | 骨架 | 多 Provider 对比（V1 后）。 |

每个 Skill 必须声明：

- `name`
- `description`
- `inputSchema`
- `outputSchema`
- `requiredCapabilities`
- `safetyRules`
- `execute(context, input)`

每个 Skill 必须能被 CLI、SDK 和 HTTP API 复用。Skill 失败时应返回结构化错误，不影响其他 Skill 注册。

### 3.4 基础能力层

基础能力层提供跨 Skill 复用能力：

- `BaziCalculator`：隔离八字排盘库。
- `ProviderFactory`：统一创建 LLM Provider。
- `RagEngine`：检索知识库并返回引用。
- `ConversationStore`：保存会话状态。
- `ProfileStore`：管理本地用户档案。
- `PromptManager`：管理版本化 Prompt。
- `SafetyGuard`：执行输入、Prompt 和输出安全边界。
- `ConfigManager`：读取 `.env` 或本地配置。
- `Logger`：记录脱敏调试日志。

## 4. npm 包架构

V1 以单 npm package 交付。暂不拆 monorepo，避免早期工程复杂度过高。

### 4.1 包身份

- 包名暂定：`xuan-agent`
- CLI 命令：`xuan`
- 首个版本建议：`0.1.0`
- 发布前检查 `xuan-agent` 是否可用。
- 如果名称不可用，改为 scoped package，例如 `@<org>/xuan-agent`。

### 4.2 包形态

同一个包同时提供：

- CLI：给个人用户直接运行。
- SDK：给 CLI、HTTP API、脚本和后续上层应用复用。
- 类型声明：给 TypeScript 调用方获得稳定类型。
- Prompt 模板和最小知识库种子：用于 V1 本地验证。

V1 npm 包只面向 Node.js，不承诺浏览器端直接运行。原因是 V1 需要本地文件读取、`.env`、本地 JSON 档案、本地知识库、图片读取和可能的向量索引。

### 4.3 CLI 命令族

建议 V1 CLI 命令族：

```bash
xuan bazi analyze
xuan bazi ask
xuan rag search
xuan provider list
xuan profile view
xuan profile save
xuan profile delete
xuan session clear
xuan config doctor
```

`xuan xiangshu analyze`（相术）与 `xuan provider compare`（多 Provider 对比）为 V2 / V1 完成后能力，V1 不交付。

CLI 只负责：

- 参数解析。
- 本地文件路径解析。
- 用户确认提示。
- 调用 SDK。
- 渲染结果。

CLI 不负责：

- 直接排盘。
- 直接调用 LLM Provider。
- 直接写用户档案。
- 直接拼接核心 Prompt。

### 4.4 SDK 公开入口

建议 V1 SDK 公开能力：

```ts
createXuanAgent()
analyzeBazi()
askFollowup()
compareProviders() // V1 后
createProviderFactory()
createSkillRegistry()
```

建议 V1 公开类型：

```ts
BirthInput
BaziChart
AnalysisRequest
AnalysisResult
RagCitation
ConversationState
UserProfile
ProviderConfig
SkillManifest
```

`analyzeXiangshu()` 与 `ImageAnalysisInput` 等相术相关能力为 V2，不进入 V1 公开 API。

内部模块默认不作为公开 API。包应通过 `exports` 明确公开入口，避免调用方依赖内部文件路径。

### 4.5 发布内容

npm 包应包含：

- `dist/`
- 类型声明文件
- `README.md`
- `LICENSE`
- `package.json`
- 必要 Prompt 模板
- 示例知识库结构或最小种子数据

npm 包不得包含：

- `.env`
- API key
- 本地用户档案
- 本地会话状态
- 用户图片
- 个人 RAG 索引缓存
- 不确定版权资料
- 含敏感信息的测试样本

发布前必须执行包内容检查，例如 `npm pack --dry-run`。

## 5. 技术选型边界

### 5.1 V1 默认技术栈

| 领域 | V1 选择 | 说明 |
| --- | --- | --- |
| 主语言 | TypeScript | 统一 CLI、SDK、HTTP API 和 Agent core。 |
| Runtime | Node.js | V1 面向本地工具和服务端集成，不承诺浏览器运行。 |
| 发布 | npm package | 便于 CLI 安装、SDK 复用和开源分发。 |
| Agent 编排 | 自研 `XuanAgent` 线性流程 | V1 不引入 LangGraph.js（ADR-0011）。 |
| LLM 抽象 | 自研 `LlmProvider` + `ProviderFactory` | 统一 Provider 调用，V1 不引入 LangChain.js（ADR-0011）。 |
| 八字排盘 | `tyme4ts` | 通过 `BaziCalculator` 适配，不让业务层直接依赖第三方对象。 |
| RAG | 本地知识库 + 可替换向量存储 | V1 小规模起步，技术设计阶段再定具体向量库。 |
| 用户档案 | 本地 JSON | 后续可升级 SQLite、PostgreSQL 或其他 DB。 |
| 配置 | `.env` 或等价本地配置 | API key 不进入日志和普通输出。 |
| 日志 | 结构化脱敏日志 | 记录调试信息，不记录完整敏感内容。 |

### 5.2 留到技术设计阶段的选择

以下选择不在产品架构文档中固定：

- CLI 框架：Commander、Yargs、oclif 或其他。
- HTTP API 框架：Hono、Fastify、NestJS 或其他。
- 构建工具：tsup、tsdown、unbuild 或其他。
- Schema 工具：Zod、Valibot、TypeBox 或其他。
- 测试框架：Vitest、Jest、Node test runner 或其他。
- 向量存储：本地文件、SQLite、LanceDB、Chroma 或其他。

### 5.3 Python 的定位

早期草稿曾以 `lunar-python` 为排盘库示例，后调整为 TS 生态的 `lunar-typescript`，最终选定 **`tyme4ts`**（同作者的新一代实现，节气采用寿星天文历算法）。Python 仅作为确定性计算能力不足时的后备 adapter 方向。

Python 不进入 V1 默认依赖。只有当 `tyme4ts` 在节气、大运、流年、神煞或流派差异等关键能力上无法满足验证时，才考虑：

- 替换 TypeScript 排盘库。
- 自行补充 `BaziCalculator` 规则。
- 通过 Python adapter 接入更成熟的计算实现。

即使引入 Python adapter，也必须隐藏在 `BaziCalculator` 接口之后，不影响 CLI、SDK、HTTP API、Skill 和 Agent 编排层。

## 6. 核心接口对象

本章定义产品架构层面的对象边界。字段细节、校验规则、错误码和 TypeScript schema 留到技术设计文档。

### 6.1 `BirthInput`

用于八字分析入口。

至少包含：

- 出生日期。
- 出生时间。
- 性别。
- 出生地。
- 历法类型：`solar` 或 `lunar`。
- 是否启用真太阳时。
- 输出模式：`beginner` 或 `advanced`。

规则：

- 缺少出生日期、出生时间、性别或历法类型时必须提示补充。
- 不确定时辰不得自动假设具体时柱。
- 含糊日期格式必须要求澄清。
- 农历输入必须标明换算能力状态和换算结果。

### 6.2 `BaziChart`

用于承载确定性排盘结果。

至少包含：

- 年柱、月柱、日柱、时柱。
- 天干地支。
- 藏干。
- 日主。
- 五行分布。
- 十神关系。
- 大运。
- 节气相关信息（V2）。
- 流年基础信息（V2）。
- 可选神煞信息（V2）。
- 排盘来源和版本。

规则：

- `BaziChart` 必须先生成，再进入 LLM 解读。
- Prompt 中必须包含结构化 `BaziChart`，不能只包含用户生日。
- 排盘失败必须返回明确错误，不得让 LLM 编造结果。
- 业务层不得直接依赖 `tyme4ts` 原始对象。

### 6.3 `BaziCalculator`

用于隔离确定性计算实现。

职责：

- 接收 `BirthInput`。
- 返回 `BaziChart`。
- 暴露排盘来源和版本。
- 抛出结构化计算错误。

V1 默认实现：

- `Tyme4tsBaziCalculator`

替换原则：

- 替换排盘库不得影响 LLM 解读、RAG、Provider、CLI、SDK 和 HTTP API。
- 如果计算能力不足，只能修改 calculator 或 adapter，不得让 LLM 补算。

### 6.4 `ImageAnalysisInput`（V2 前瞻）

用于相术分析入口。V1 不交付，此处保留为 V2 前瞻类型。

至少包含：

- 图像文件或本地路径。
- 分析类型：`face` 或 `palm`。
- 输出模式：`beginner` 或 `advanced`。
- 用户问题。

规则：

- 未选择分析类型时必须提示。
- 图片不可读、格式不支持或文件过大时必须返回明确错误。
- 发送图片给 Provider 前必须提示用户数据流向。
- Vision 不可用的 Provider 不得进入相术流程。

### 6.5 `AnalysisResult`

用于统一八字、相术、追问和对比输出。

至少包含：

- 当前 Skill。
- Provider 和模型。
- 输出模式。
- 结构化结果。
- 自然语言解读。
- RAG 引用。
- 边界提醒。
- 可继续追问的问题。
- 不确定性说明。

规则：

- 每次分析都必须包含边界提醒。
- Provider 对比结果必须标明每段内容对应的 Provider 和模型。
- 安全边界失败时应返回结构化错误或降级说明。

### 6.6 `RagCitation`

用于表达引用依据。

至少包含：

- 来源名称。
- 内容类型。
- 原文片段。
- 现代释义。
- Agent 总结。
- 相关标签。
- 命中说明。

规则：

- 输出中必须区分原文、释义和模型总结。
- 没有可靠命中时必须说明“未检索到明确依据”。
- 引用服务解释，不应大段堆砌。
- 不确定版权或来源不明资料不得作为正式核心知识库内容。

### 6.7 `ConversationState`

用于会话状态。

至少包含：

- 当前 Skill。
- 当前用户问题。
- 当前排盘结果或图像分析摘要。
- 当前输出模式。
- 当前 Provider 和模型。
- 本轮 RAG 命中摘要。
- 会话 ID 或 thread ID。

规则：

- 同一会话追问时必须复用上一轮分析上下文。
- 八字追问不得重新生成不同排盘。
- 新会话默认不自动读取上一会话敏感内容，除非用户启用档案。

### 6.8 `UserProfile`

用于长期用户档案。

可保存：

- 用户昵称或本地 ID。
- 用户授权保存的出生信息。
- 常用历法设置。
- 偏好输出模式。
- 偏好表达风格。
- 历史八字分析摘要。
- 历史相术分析摘要。
- 用户常问主题。
- 用户授权保存的备注。

规则：

- 默认不写入长期档案；短期会话（含盘面输入）本地自动保存、可清理（ADR-0012）。
- 出生信息、出生地、图片或完整对话不写入长期档案。
- 首次保存用户档案前必须提示用户确认。
- 用户必须能查看、更新、删除档案。
- 临时模式不写入长期档案。

### 6.9 `ProviderConfig`

用于 LLM Provider 配置。

至少包含：

- Provider 名称。
- 模型名。
- API key。
- Base URL。
- 温度等基础参数。
- 是否支持 Vision。
- 是否支持 streaming。
- 是否支持 structured output。

规则：

- API key 不得写入日志或普通输出。
- Provider 配置缺失时必须返回明确错误。
- 普通用户默认使用当前配置，不需要理解 Provider 概念。

### 6.10 `SkillManifest`

用于 Skill 注册。

至少包含：

- Skill 名称。
- 说明。
- 输入类型。
- 输出类型。
- 依赖能力。
- 可用入口。
- 安全边界。
- 版本。

规则：

- 新 Skill 不应要求重写核心 Agent 流程。
- 新 Skill 应复用统一记忆、Provider、RAG 和 Safety 能力。
- 新 Skill 如果包含确定性计算，必须先用规则、库或工具完成计算，再交给 LLM 解读。

## 7. 核心流程

### 7.1 八字分析流程

```text
CLI / SDK / HTTP API
  -> validate BirthInput
  -> BaziSkill
  -> BaziCalculator
  -> BaziChart
  -> optional RagEngine
  -> PromptManager + SafetyGuard
  -> ProviderFactory + LLM
  -> AnalysisResult
  -> ConversationStore
  -> optional ProfileStore
```

流程规则：

- 输入校验先于排盘。
- 排盘先于 LLM。
- RAG 根据输出模式和用户问题触发。
- 通俗模式默认少术语、短句、生活化解释。
- 进阶模式必须展开专业维度和依据。
- 每次输出包含兴趣型自我探索边界提醒。
- 用户授权前不写入长期档案。

### 7.2 八字追问流程

```text
Follow-up question
  -> load ConversationState
  -> reuse BaziChart
  -> classify follow-up intent
  -> optional RagEngine
  -> ProviderFactory + LLM
  -> AnalysisResult
  -> update ConversationState
```

支持追问：

- 解释术语。
- 解释判断依据。
- 改写输出风格。
- 切换通俗 / 进阶模式。
- 切换 Provider 并复用同盘对比。

规则：

- 同一会话内不得重新生成不同排盘。
- 术语解释应结合当前盘面，而不是只给百科定义。
- 用户要求依据时优先检索 RAG。

### 7.3 相术分析流程（V2）

V2 实现，V1 不包含。流程如下：

```text
CLI / SDK / HTTP API
  -> validate ImageAnalysisInput
  -> check image readability
  -> check provider vision capability
  -> user privacy notice
  -> XiangshuSkill
  -> PromptManager + SafetyGuard
  -> Vision Provider
  -> AnalysisResult
  -> ConversationStore
```

流程规则（V2）：

- 图像不可读、格式不支持或文件过大时返回明确错误。
- 分析前提示用户避免上传未授权的他人照片。
- 发送图片前提示会发送给对应 LLM Provider。
- 输出必须说明图像质量、可见区域、不确定性和限制。
- 禁止身份识别、敏感属性推断、疾病判断和外貌价值评判。
- 看不清的区域必须标记“不确定”或“不可见”。

### 7.4 RAG 引用流程

```text
Need evidence / advanced mode / terminology question
  -> RagEngine
  -> retrieve local knowledge base
  -> rank citations
  -> return RagCitation[]
  -> PromptManager
  -> LLM synthesis
```

触发场景：

- 进阶模式。
- 解释专业术语。
- 用户追问“依据是什么”。
- 需要古籍或知识库支持的判断。

规则：

- 普通模式默认只展示简短来源和一句解释。
- 进阶模式可展示更完整原文、释义和 Agent 总结。
- 没有可靠命中时说明未检索到明确依据。
- 古籍观点不得包装成确定性结论。

### 7.5 Provider 对比流程（V1 完成后）

V1 完成后验证能力，V1 不交付。流程如下：

```text
Compare request
  -> freeze deterministic input
  -> select providers
  -> run same prompt/evidence against providers
  -> collect results (并列输出，不自动评分)
  -> AnalysisResult
```

规则：

- 八字对比必须复用同一份 `BaziChart`。
- RAG 对比必须复用同一组证据。
- 每段结果标明 Provider 和模型。
- 不做自动评分，只做并列输出；维度评估由用户自行判断。

### 7.6 档案管理流程

```text
Profile command / SDK call
  -> validate profile operation
  -> confirm when writing sensitive data
  -> ProfileStore
  -> return sanitized result
```

规则：

- 默认临时模式不写入长期档案。
- 保存、更新、删除档案必须有明确用户动作。
- 删除档案应删除本地保存内容。
- 日志只记录是否使用档案，不记录完整敏感内容。

## 8. 安全与隐私架构

安全和隐私必须进入系统逻辑，而不只是文档里的边界提醒。

### 8.1 SafetyGuard

`SafetyGuard` 至少覆盖：

- 输入前置检查。
- Prompt 安全指令注入。
- LLM 输出后处理。
- 高风险内容降级。
- Provider 能力检查。
- 日志脱敏。

### 8.2 禁止内容

系统不得输出或执行：

- 吉凶断言。
- 宿命论标签。
- 医疗、法律、投资、婚育等重大决策建议。
- 基于图像的人物身份识别。
- 种族、民族、宗教、政治倾向、疾病状态等敏感属性推断。
- 外貌价值评判。
- API key 或完整敏感配置展示。
- 伪造排盘结果或伪造 RAG 来源。

### 8.3 默认隐私策略

V1 默认（长期档案与对外输出层面；短期会话见 ADR-0012）：

- 不把出生信息写入长期档案。
- 不把出生地写入长期档案。
- 不保存图片。
- 不把完整对话写入长期档案（短期会话为本地缓存，可清理）。
- 不在日志中记录完整 API key。
- 不在日志中记录完整图片内容。
- 不在日志中记录未脱敏用户档案。

用户必须能：

- 知道哪些数据会发送给 LLM Provider。
- 知道哪些数据会保存在本地。
- 关闭长期档案。
- 删除档案和历史记录。

## 9. RAG 知识库架构

V1 RAG 目标是提供可追溯解释依据，不替代产品判断。

### 9.1 内容范围

V1 优先覆盖：

- 八字基础术语。
- 天干地支。
- 五行生克。
- 十神。
- 神煞。
- 格局。
- 大运流年。
- 面相基础观察维度。
- 手相基础观察维度。
- 古籍摘录与现代释义。

### 9.2 知识条目

每条知识应记录：

- 来源名称。
- 内容类型。
- 原文或整理文本。
- 现代释义。
- 标签。
- 适用 Skill。
- 版权或来源状态。

### 9.3 检索策略

V1 先支持小规模本地知识库。向量数据库选择留到技术设计阶段。

RAG 输出必须：

- 明确来源。
- 区分原文、释义和 Agent 总结。
- 在无可靠命中时明确说明。
- 避免长篇堆砌引用。

## 10. 可观测性

V1 至少记录以下脱敏调试信息：

- 当前 Provider。
- 当前模型。
- 当前 Skill。
- 排盘库来源和版本。
- RAG 命中文档。
- 是否使用用户档案。
- 是否保存会话状态。
- 请求阶段状态：校验、排盘、RAG、LLM、输出后处理。
- 错误类型和错误阶段。

日志不得记录：

- 完整 API key。
- 完整出生信息。
- 完整出生地。
- 完整图片内容。
- 未脱敏档案。
- 完整私密对话。

## 11. 排盘准确性验证

TypeScript-first 的主要风险在八字计算细节。

### 11.1 已验证（2026-10）

对 V1 排盘库做过一次**三实现交叉对拍**（`tyme4ts`、`lunar-typescript`、`cnlunar`），21 个用例覆盖公历 / 农历 / 闰月 / 节气边界 / 子时 / 大运顺逆四象限：

- `tyme4ts` 与 `lunar-typescript` 结果一致（仅晚子时默认流派不同）。
- 两者的节气时刻与权威值**逐秒吻合**（例：惊蛰 1992-03-05 15:52:08、立秋 1985-08-07 22:04:16）。
- `cnlunar` 的节气处理有偏差、月柱算错，**已排除**。

结论：`tyme4ts` 的排盘（含节气边界、农历、闰月、立春分界）可信，**不需要 fork 修 bug**。

### 11.2 回归基线

V1 保留一份**最小回归基线**（`tests/fixtures/`）：期望值取自已验证的库输出，用于防止后续重构或升级库时结果悄然变化。它**不用于证明正确性，只用于防回归**。

基线覆盖：节气边界、晚子时、闰月、农历换算、大运顺逆四象限。每例断言年柱、月柱、日柱、时柱、日主、十神基础关系、大运基础信息与排盘来源。

### 11.3 验证原则

- 排盘失败时返回明确错误。
- 出现差异时不得让 LLM 修正。
- 只能修正 `BaziCalculator` 或替换确定性排盘库。
- 流派差异大的内容（格局、神煞）必须允许标记“未支持”“待确认”或“不同流派可能有不同看法”。

## 12. 错误处理与降级

V1 错误应结构化返回，便于 CLI、SDK 和 HTTP API 复用。

典型错误：

- `VALIDATION_ERROR`：输入缺失、日期歧义、图片类型不支持。
- `CALCULATION_ERROR`：排盘失败或排盘能力未支持。
- `PROVIDER_CONFIG_ERROR`：Provider 缺失配置。
- `PROVIDER_CAPABILITY_ERROR`：Provider 不支持 Vision、streaming 或 structured output。
- `LLM_ERROR`：模型调用失败。
- `RAG_NO_RESULT`：未检索到明确依据。
- `PROFILE_PERMISSION_REQUIRED`：写入档案需要用户确认。
- `SAFETY_BLOCKED`：请求或输出触发安全边界。

降级策略：

- RAG 无命中时仍可输出，但必须说明缺少明确依据。
- Vision Provider 不可用时提示切换模型，不进入图像分析。
- 排盘失败时不进入 LLM 解读。
- 用户不保存档案时仍可完成临时会话分析。

## 13. 发布与分发

### 13.1 本地开发

V1 应支持：

- 从源码运行 CLI。
- 本地 link 测试 CLI。
- 在 Node/TS 项目中直接导入 SDK。
- 使用 `.env` 或本地配置加载 Provider。

### 13.2 预发布检查

发布 npm 包前必须检查：

- 类型检查通过。
- 单元测试通过。
- 排盘样例测试通过。
- CLI smoke test 通过。
- SDK import smoke test 通过。
- `npm pack --dry-run` 确认包内容。
- `.env`、API key、用户档案、图片、缓存和私有知识库未进入包。

### 13.3 版本策略

- V1 验证期使用 `0.x` 版本。
- 首个公开验证版本建议 `0.1.0`。
- 破坏性变更在 `0.x` 内允许，但必须写 changelog。
- SDK 公开 API 要比内部模块更稳定。

### 13.4 安装使用

目标使用方式：

```bash
npx xuan-agent bazi analyze --date 1995-03-12 --time 08:30 --gender male --calendar solar
```

或全局安装后：

```bash
xuan bazi analyze --date 1995-03-12 --time 08:30 --gender male --calendar solar
```

SDK 使用方式：

```ts
import { createXuanAgent } from "xuan-agent";

const agent = createXuanAgent();
const result = await agent.analyzeBazi({
  date: "1995-03-12",
  time: "08:30",
  gender: "male",
  calendar: "solar",
  mode: "beginner"
});
```

以上示例只表达产品架构意图，最终参数名和 schema 以技术设计文档为准。


---

## 详细设计（第 14 章起）

第 14 章及之后的详细工程设计（工程蓝图、package.json 契约、类型/Schema、SDK/CLI/HTTP 契约、LangGraph workflow、Provider、Skill manifest、RAG 文件格式、Prompt、存储、测试矩阵、里程碑、PRD 需求映射）已拆分到独立文档：

- [技术设计文档](./technical-design.md)
