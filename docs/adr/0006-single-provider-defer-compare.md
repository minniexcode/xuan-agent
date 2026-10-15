# ADR-0006：V1 单 Provider（openai-compatible/DeepSeek），多 Provider 对比延后

- 状态：已采纳（Accepted）
- 日期：2026-10-15

## 背景（Context）

PRD 早期把"多 LLM Provider 对比"列为 V1 卖点。但个人验证阶段实际主要使用 DeepSeek key；若 V1 只跑一个 key，对比会空转，且"对比维度打分（术语准确度、表达质量等）"隐含自动评分，成本与复杂度都高。

## 决策（Decision）

V1 默认单一 Provider：DeepSeek，经 `openai-compatible` adapter 接入（`anthropic` 保留为骨架，其余 adapter 留待后续）。Provider 抽象保持一致、可切换。多 Provider 对比（同一输入并列输出、标注 Provider/模型、不做自动评分）降级为"V1 完成后验证能力"，不作为 V1 交付卖点。

## 后果（Consequences）

- 正面：V1 聚焦八字核心闭环，省 token 与实现成本；切换能力仍然保留。
- 代价："多模型对比"这一差异化卖点延后兑现；`provider-compare` Skill 与相关命令按"V1 后"标记。

关联：[ADR-0005](./0005-langgraph-langchain.md)
