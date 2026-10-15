# 玄枢（xuan-agent）

> Five Arts AI Agent —— 面向传统五术与自我探索场景的 AI Agent

玄枢用确定性算法完成排盘与结构化计算，再由 LLM 做中性、可解释、可追问的解读。它不试图把玄学包装成确定性预测系统，而是把排盘、术语解释、古籍引用、个人档案和连续对话整合成一个可追溯、有节制的工具。

**项目状态：V1 功能已实现（Milestone 1–5），处于 npm 预发布准备阶段。** 八字排盘、通俗/进阶解读、同盘追问、RAG 检索、会话记忆与用户档案均已落地；相术与多 Provider 对比为 V2。

## 它是什么，不是什么

玄枢的定位是面向个人使用的玄学分析 Agent：

- V1 面向开发者与有基础的爱好者，以 CLI + SDK 交付
- 面向普通用户的兴趣型自我探索体验（接近星座、MBTI 的轻量内容）由 V2 独立前端项目交付
- 以八字为 V1 起点、插件化支持后续五术扩展

它**不是**：

- 算命结论生成器，或吉凶断言系统
- 医疗、法律、投资、婚育等高风险决策工具
- 面部识别或生物特征识别产品

## 核心原则：计算与解读分离

这是整个设计的非协商规则：

- **确定性排盘由库完成**，不由 LLM 完成。LLM 不做算术，不自行推导干支、十神、节气、大运。
- **LLM 只负责解释**：基于结构化结果做关联、表达、追问和风格化输出。
- **RAG 提供引用依据**，从古籍与术语库检索证据，让输出可追溯，而不是纯主观生成。

## V1 范围

V1 聚焦八字命理：

- 出生信息采集与确定性排盘
- 通俗模式 / 进阶模式两层结构化解读
- 围绕排盘结果的连续追问与同盘复用
- 会话记忆与用户档案记忆
- RAG 古籍引用检索
- 多 Provider 可切换（V1 默认单一 Provider）

V1 明确不做：相术图像分析、多 Provider 对比、HTTP API 交付（仅保留骨架）、前端页面、多用户账号与支付体系。

上述能力中的相术（面相 / 手相）与多 Provider 对比为 V2 首要扩展方向。

## 技术栈

| 领域 | 选型 |
| --- | --- |
| 语言 / 运行时 | TypeScript-first，Node.js（`"type": "module"`，`>= 20`） |
| 交付形态 | 单一 npm 包 `xuan-agent`：CLI 命令 `xuan` + SDK 入口 `xuan-agent`，无 monorepo |
| Agent 编排 | 自研 `XuanAgent` 线性流程（V1 不引入 LangGraph.js，见 [ADR-0011](docs/adr.md)） |
| LLM 抽象 | 自研 `LlmProvider` + `ProviderFactory`（openai-compatible 走 `fetch`） |
| 八字计算 | `tyme4ts`，隔离在 `BaziCalculator` 接口之后 |
| RAG / 档案 / 会话 / 配置 | 全部本地优先 |

Python **不是** V1 默认依赖，仅在 `tyme4ts` 能力不足时作为 `BaziCalculator` 的后备 adapter 方向。

CLI 框架、HTTP 框架、构建工具、schema 库、测试框架与向量存储等框架级选择，留待[技术设计文档](docs/technical-design.md)确定。

## 架构分层

```text
Entry（CLI / SDK）
  → Orchestration（XuanAgent）
    → Foundation（BaziCalculator / ProviderFactory / RagEngine / ConversationStore
                  / ProfileStore / PromptManager / SafetyGuard / ConfigManager / Logger）
```

目录结构：

```text
src/
  index.ts          # SDK 公开入口（唯一默认公开 API）
  cli/              # commander 命令：bazi / rag / session / profile / provider / config
  agent/            # XuanAgent 线性编排（校验→排盘→RAG→Prompt→LLM→审计→存会话）
  calculators/      # BaziCalculator 接口 + tyme4ts adapter
  providers/        # LlmProvider 接口 + ProviderFactory + openai-compatible / mock
  rag/              # RagEngine（关键词检索）+ document-loader
  conversations/    # ConversationState + ConversationStore（本地 JSON）
  profiles/         # ProfileStore
  prompts/ safety/ config/ logging/ schemas/ storage/ errors/
knowledge/seed/     # 最小知识库种子（随包发布）
tests/
```

## 安装与使用

先配置 `.env`（复制 `.env.example` 填入 API key）：

```bash
cp .env.example .env
```

CLI 用法：

```bash
npm run build
node dist/cli/main.js bazi analyze --date 1995-03-12 --time 08:30 --gender male --calendar solar
node dist/cli/main.js bazi ask --session <id> --question "什么是正印？"   # 同盘追问
node dist/cli/main.js rag search --query "正印"                            # RAG 检索
node dist/cli/main.js provider list                                        # Provider 能力表
node dist/cli/main.js profile save --date 1995-03-12 --time 08:30 --gender male --calendar solar --confirm
node dist/cli/main.js profile view
node dist/cli/main.js session clear                                        # 清理会话
node dist/cli/main.js config doctor                                        # 查看配置
```

发布后以 `xuan` 命令替代 `node dist/cli/main.js`。`xuan xiangshu analyze` 与 `xuan provider compare` 属 V2 能力，V1 不交付。

SDK 用法：

```ts
import { createXuanAgent } from "xuan-agent";

const agent = createXuanAgent();
const result = await agent.analyzeBazi({
  date: "1995-03-12",
  time: "08:30",
  gender: "male",
  calendar: "solar",
});
const followup = await agent.askFollowup({ question: "什么是正印？" }); // 续最近会话
const hits = await agent.searchRag({ query: "正印" });
```

参数名与 schema 以[技术设计文档](docs/technical-design.md)为准。

开发脚本（已实现）：

```bash
npm run typecheck      # tsc --noEmit
npm test               # 单元 + 集成测试
npm run test:fixtures  # 八字回归基线
npm run test:smoke     # CLI / SDK 冒烟测试
npm run build
npm run pack:dry       # npm pack --dry-run
```

## 隐私与安全

- **默认不持久化**出生信息、出生地、图像与完整对话。
- **日志脱敏**：不记录完整 API key、出生信息、图像内容或未脱敏档案。
- **`SafetyGuard`** 负责输入检查、Prompt 注入防御、输出后处理与高风险降级。
- **禁止输出**：吉凶断言、宿命论标签、医疗 / 法律 / 投资 / 婚育建议、图像身份识别、敏感属性推断、相貌价值评判、伪造排盘或伪造 RAG 来源。

## 文档

- [`docs/prd.md`](docs/prd.md) —— 产品需求文档（PRD，简略：FR 索引）
- [`docs/requirements.md`](docs/requirements.md) —— 详细功能需求规格
- [`docs/product-architecture.md`](docs/product-architecture.md) —— 产品架构
- [`docs/technical-design.md`](docs/technical-design.md) —— 技术设计（工程蓝图、契约、类型、流程、测试、里程碑）
- [`docs/adr.md`](docs/adr.md) —— 架构决策记录（ADR）
- [`docs/code-tour.md`](docs/code-tour.md) —— 代码导览（渐进式阅读指南，含 review 检查清单与 Vision 接入点）

文档顺序为 PRD → 详细需求规格 → 产品架构 → 技术设计；决策理由见 ADR。这些文档共同构成唯一事实来源。**读代码从 `docs/code-tour.md` 开始。**

## 贡献

项目处于个人工具验证阶段，贡献指南、数据版权说明与古籍资料来源说明将在开源前整理。

## License

[MIT](LICENSE) © 2026 xuan-agent contributors
