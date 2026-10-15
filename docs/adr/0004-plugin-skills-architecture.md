# ADR-0004：插件化 Skills 架构

- 状态：已采纳（Accepted）
- 日期：2026-10-15

## 背景（Context）

五术门类多（八字、相术、六爻、紫微、奇门、梅花等），若各术能力耦合进核心 Agent 流程，每新增一门都要改造核心。PRD 调研也显示，成熟项目倾向把八字/相术/占卜等拆成独立 Skill。

## 决策（Decision）

每个"术"或子能力作为独立 Skill，经 `SkillRegistry` 注册与复用。统一 `SkillManifest` 契约：`name`、`description`、`inputSchema`、`outputSchema`、`requiredCapabilities`、`safetyRules`、`execute(context, input)`。所有 Skill 复用统一的记忆、Provider、RAG 与 Safety 能力；Skill 失败结构化返回、不影响其他 Skill 注册。

V1 Skill：`bazi`、`rag-reference`、`profile-memory`、`provider-compare`（V1 后验证）；V2 扩展：`xiangshu-face`、`xiangshu-palm` 及六爻/紫微等。

## 后果（Consequences）

- 正面：新增术数不重写核心；每 Skill 独立测试与失败隔离；扩展性由接口契约保证。
- 代价：需要定义并维护稳定的 Skill 接口契约；对"什么是 Skill、什么是基础能力"的边界需持续澄清。

关联：[ADR-0006](./0006-single-provider-defer-compare.md)、[ADR-0007](./0007-bazi-first-xiangshu-v2.md)
