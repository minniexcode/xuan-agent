# 玄枢（xuan-agent）产品架构与详细设计文档

## 文档信息

- 状态：Draft
- 产品中文名：玄枢
- 英文项目名：`xuan-agent`
- 文档定位：产品架构与详细架构设计文档
- 上游文档：`xuan-agent-prd.md`
- 下游文档：技术设计文档
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
- Agent 编排使用 LangGraph.js。
- LLM 抽象使用 LangChain.js，并通过 Provider Factory 隔离不同模型服务。
- 八字确定性排盘优先使用 `lunar-typescript`，并通过 `BaziCalculator` 接口隔离具体排盘库。
- 相术（V2）使用 Vision-capable LLM，不引入额外 CV 模型。
- RAG、用户档案、会话状态和配置均本地优先。
- Python 不进入 V1 默认架构，只作为未来确定性计算能力不足时的后备 adapter 方向。

选择 TypeScript-first 的原因：

- 玄枢 V1 更像开发者工具型 Agent，而不是纯 AI/ML pipeline。
- CLI、SDK、插件化、npm 分发、MCP/IDE/桌面端扩展和 Web 集成都更贴近 TS/npm 生态。
- npm 包可同时承载命令行工具和可复用 SDK，便于个人使用、开源传播和后续集成。
- `lunar-typescript` 能作为 V1 八字计算起点，但必须通过样例集验证排盘准确性。

## 2. 架构目标

产品架构需要承接 PRD 中的 V1 能力边界：

- 支撑八字命理核心能力（相术为 V2 扩展方向）。
- 保证确定性计算和 LLM 解读分离。
- 让 CLI、SDK 和 HTTP API 复用同一套核心能力。
- 支持多 LLM Provider 切换与对比。
- 支持 RAG 引用、对话级记忆、用户档案和 Skill 扩展。
- 默认保护出生信息、出生地、图像、用户档案、API key 和对话历史。
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
  |-- profile-memory
  |-- provider-compare
  |
Foundation Layer
  |
  |-- BaziCalculator
  |-- ProviderFactory
  |-- RagEngine
  |-- MemoryStore
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

- CLI 是 V1 主入口，适合本地个人使用、调试排盘、调试 Prompt、管理档案和对比 Provider。
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
- 写入会话级记忆。
- 在用户显式确认后写入长期档案。

LangGraph.js 用于表达有状态流程，尤其是八字追问、同盘复用、多 Provider 对比和会话 checkpoint。

### 3.3 Skill 层

Skill 是可注册、可替换、可复用的业务能力单元。

V1 必须包含：

| Skill | 说明 |
| --- | --- |
| `bazi` | 八字排盘与解读。 |
| `rag-reference` | 古籍、术语和知识库检索引用。 |
| `profile-memory` | 用户档案和偏好管理。 |
| `provider-compare` | 多 Provider 对比（V1 完成后验证）。 |

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
- `MemoryStore`：保存会话级状态。
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
| Agent 编排 | LangGraph.js | 用于有状态 Agent 流程和会话 checkpoint。 |
| LLM 抽象 | LangChain.js | 统一 Provider 调用、structured output、streaming 和工具链。 |
| 八字排盘 | `lunar-typescript` | 通过 `BaziCalculator` 适配，不让业务层直接依赖第三方对象。 |
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

早期草稿曾以 `lunar-python` 为排盘库示例；本产品架构将其调整为 TS 生态的 `lunar-typescript`，V1 默认采用。Python 仅作为确定性计算能力不足时的后备 adapter 方向。

Python 不进入 V1 默认依赖。只有当 `lunar-typescript` 在节气、大运、流年、神煞或流派差异等关键能力上无法满足样例校验时，才考虑：

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
- 输出模式：`beginner`、`advanced` 或 `both`。

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
- 节气相关信息。
- 大运。
- 流年基础信息。
- 可选神煞信息。
- 排盘来源和版本。

规则：

- `BaziChart` 必须先生成，再进入 LLM 解读。
- Prompt 中必须包含结构化 `BaziChart`，不能只包含用户生日。
- 排盘失败必须返回明确错误，不得让 LLM 编造结果。
- 业务层不得直接依赖 `lunar-typescript` 原始对象。

### 6.3 `BaziCalculator`

用于隔离确定性计算实现。

职责：

- 接收 `BirthInput`。
- 返回 `BaziChart`。
- 暴露排盘来源和版本。
- 抛出结构化计算错误。

V1 默认实现：

- `LunarTypescriptBaziCalculator`

替换原则：

- 替换排盘库不得影响 LLM 解读、RAG、Provider、CLI、SDK 和 HTTP API。
- 如果计算能力不足，只能修改 calculator 或 adapter，不得让 LLM 补算。

### 6.4 `ImageAnalysisInput`

用于相术分析入口。

至少包含：

- 图像文件或本地路径。
- 分析类型：`face` 或 `palm`。
- 输出模式：`beginner`、`advanced` 或 `both`。
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

用于对话级记忆。

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

- 默认不永久保存出生信息、出生地、图片或完整对话。
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
  -> MemoryStore
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
  -> MemoryStore
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

安全和隐私必须进入系统逻辑，而不只是文档免责声明。

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

V1 默认：

- 不永久保存出生信息。
- 不永久保存出生地。
- 不永久保存图片。
- 不永久保存完整对话。
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
- 是否保存对话级记忆。
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

TypeScript-first 的主要风险在八字计算细节。V1 必须建立排盘样例集验证 `lunar-typescript` 输出。

样例集至少覆盖：

- 公历生日。
- 农历生日。
- 不确定时辰。
- 节气附近日期。
- 不同出生时间段。
- 不同性别的大运顺逆。
- 农历换算。
- 真太阳时关闭状态。

每个样例至少断言：

- 年柱。
- 月柱。
- 日柱。
- 时柱或不确定时辰提示。
- 日主。
- 五行基础分布。
- 十神基础关系。
- 大运基础信息。
- 排盘来源。

验证原则：

- 排盘失败时返回明确错误。
- 样例不通过时不得让 LLM 修正。
- 只能修正 `BaziCalculator` 或替换确定性排盘库。
- 流派差异大的内容必须允许标记“未支持”“待确认”或“不同流派可能有不同看法”。

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

## 14. 详细工程蓝图

本章把 V1 的工程边界前移到产品架构文档中。实现者应优先按本章设计落地，只有框架选型和极少数库级细节留给技术设计阶段微调。

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

技术设计文档应在本架构基础上继续细化到代码级实现：

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
