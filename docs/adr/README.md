# 架构决策记录（ADR）

玄枢（xuan-agent）的架构决策记录。每条记录一个难以逆转或影响面大的决策，含背景、决策与后果。

| ADR | 决策 | 状态 |
| --- | --- | --- |
| [0001](./0001-typescript-npm-package.md) | TypeScript-first + 单 npm 包（CLI+SDK），弃 Python | 已采纳 |
| [0002](./0002-deterministic-calc-separation.md) | 计算与解读分离（排盘交库，LLM 只解读） | 已采纳 |
| [0003](./0003-lunar-typescript-bazi-calculator.md) | 排盘库 `lunar-typescript`，经 `BaziCalculator` 隔离 | 已采纳 |
| [0004](./0004-plugin-skills-architecture.md) | 插件化 Skills 架构（每术一 Skill） | 已采纳 |
| [0005](./0005-langgraph-langchain.md) | LangGraph.js 编排 + LangChain.js 抽象 | 已采纳 |
| [0006](./0006-single-provider-defer-compare.md) | V1 单 Provider（DeepSeek/openai-compatible），对比延后 | 已采纳 |
| [0007](./0007-bazi-first-xiangshu-v2.md) | 相术推迟 V2，V1 聚焦八字 | 已采纳 |
| [0008](./0008-local-first-privacy.md) | 本地优先存储 + 隐私默认 | 已采纳 |
| [0009](./0009-neutral-analysis-safety.md) | 中性分析安全边界（不吉凶断言 + SafetyGuard） | 已采纳 |
