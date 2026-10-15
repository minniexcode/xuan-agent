# 玄枢（xuan-agent）

> Five Arts AI Agent —— 面向传统五术与自我探索场景的 AI Agent

玄枢用确定性算法完成排盘与结构化计算，再由 LLM 做中性、可解释、可追问的解读。它不试图把玄学包装成确定性预测系统，而是把排盘、术语解释、古籍引用、个人档案和连续对话整合成一个可追溯、有节制的工具。

**项目状态：规划阶段（pre-implementation）。** 仓库当前只有产品与架构文档，`src/` 为空，尚无 `package.json`。下方命令与 API 均为已确定的设计契约，尚未实现。

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
- 对话级记忆与用户档案级记忆
- RAG 古籍引用检索
- 多 Provider 可切换（V1 默认单一 Provider）

V1 明确不做：相术图像分析、多 Provider 对比、HTTP API 交付（仅保留骨架）、前端页面、多用户账号与支付体系。

上述能力中的相术（面相 / 手相）与多 Provider 对比为 V2 首要扩展方向。

## 技术栈

| 领域 | 选型 |
| --- | --- |
| 语言 / 运行时 | TypeScript-first，Node.js（`"type": "module"`，`>= 20`） |
| 交付形态 | 单一 npm 包 `xuan-agent`：CLI 命令 `xuan` + SDK 入口 `xuan-agent`，无 monorepo |
| Agent 编排 | LangGraph.js |
| LLM 抽象 | LangChain.js + `ProviderFactory`（OpenAI / Anthropic / DeepSeek / 通用 OpenAI 兼容） |
| 八字计算 | `lunar-typescript`，隔离在 `BaziCalculator` 接口之后 |
| RAG / 档案 / 会话 / 配置 | 全部本地优先 |

Python **不是** V1 默认依赖，仅在 `lunar-typescript` 未通过样例集验证时作为 `BaziCalculator` 的后备 adapter 方向。

CLI 框架、HTTP 框架、构建工具、schema 库、测试框架与向量存储等框架级选择，留待尚未撰写的技术设计文档。

## 架构分层

```text
Entry（CLI / SDK / HTTP API adapters）
  → Orchestration（XuanAgent / LangGraphWorkflow / ConversationStateManager）
    → Skill（bazi / rag-reference / profile-memory / provider-compare）
      → Foundation（BaziCalculator / ProviderFactory / RagEngine / MemoryStore
                    / ProfileStore / PromptManager / SafetyGuard / ConfigManager / Logger）
```

规划目录：

```text
src/
  index.ts        # SDK 公开入口（唯一默认公开 API）
  cli/  api/      # 入口层，不直接调用排盘库 / LangChain / RAG / 存储
  agent/  workflows/
  skills/  providers/  calculators/  rag/  memory/  profiles/
  prompts/  safety/  config/  logging/  schemas/  storage/  errors/
knowledge/seed/   # 最小知识库种子
examples/  tests/
```

## 安装与使用（尚未实现）

目标 CLI 用法：

```bash
npx xuan-agent bazi analyze --date 1995-03-12 --time 08:30 --gender male --calendar solar
xuan bazi analyze    # 八字分析
xuan bazi ask        # 围绕结果追问
xuan rag search      # RAG 检索测试
xuan provider list   # 查看 Provider
xuan profile view|save|delete
xuan config doctor   # 查看当前配置
```

`xuan xiangshu analyze` 与 `xuan provider compare` 属 V2 能力，V1 不交付。

目标 SDK 用法：

```ts
import { createXuanAgent } from "xuan-agent";

const agent = createXuanAgent();
const result = await agent.analyzeBazi({
  date: "1995-03-12",
  time: "08:30",
  gender: "male",
  calendar: "solar",
  mode: "beginner",
});
```

参数名与 schema 以技术设计文档为准。

开发脚本（契约，待实现）：

```bash
npm run typecheck      # tsc --noEmit
npm test               # 单元 + 集成测试
npm run test:fixtures  # 八字样例集测试
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

- [`docs/prd.md`](docs/prd.md) —— 产品需求文档（PRD）
- [`docs/product-architecture.md`](docs/product-architecture.md) —— 产品架构与详细设计
- 技术设计文档 —— 尚未撰写

文档顺序为 PRD → 产品架构 → 技术设计。两份文档是唯一事实来源。

## 贡献

项目处于个人工具验证阶段，贡献指南、数据版权说明与古籍资料来源说明将在开源前整理。

## License

[MIT](LICENSE) © 2026 xuan-agent contributors
