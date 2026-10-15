# ADR-0005：LangGraph.js 编排 + LangChain.js 抽象

- 状态：已采纳（Accepted）
- 日期：2026-10-15

## 背景（Context）

八字追问、同盘复用、多 Provider 对比等是有状态的流程，需要保留会话状态与 checkpoint；同时多 Provider 需要统一调用接口（文本、structured output、streaming、工具链）。自研编排与抽象成本高、易重复造轮子。

## 决策（Decision）

- 编排：LangGraph.js 表达有状态 workflow（八字/追问/对比），支持 checkpointer 保存会话状态。
- LLM 抽象：LangChain.js 统一 Provider 调用、structured output、streaming 与工具链；Provider 经 `ProviderFactory` 隔离，业务层不绑定单一 Provider。

## 后果（Consequences）

- 正面：同盘复用与连续追问的状态管理更可靠；LLM 可切换、可对比；减少自研框架成本。
- 代价：引入两个框架的抽象层与版本依赖；SDK 使用者无需理解 LangChain/LangGraph，但内部需维护适配层。

关联：[ADR-0006](./0006-single-provider-defer-compare.md)
