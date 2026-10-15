# ADR-0007：相术推迟 V2，V1 聚焦八字

- 状态：已采纳（Accepted）
- 日期：2026-10-15

## 背景（Context）

PRD 早期 V1 范围是"八字 + 相术（面相/手相）"。但玄枢的核心假设是"计算与解读分离"——八字直接检验它（确定性排盘 + LLM 解读），而相术是纯 Vision LLM、没有确定性计算，V1 做相术不验证任何核心假设，却带来最大的隐私/安全成本（真实人脸照片 + 外部 Provider + 身份识别红线）。

## 决策（Decision）

V1 只做八字完整闭环（排盘 → RAG → 通俗/进阶双层解读 → 追问）。相术（`xiangshu-face`、`xiangshu-palm`）整体移入 V2，作为首要扩展方向，与前端一起做。

## 后果（Consequences）

- 正面：V1 范围收窄、风险可控；排盘准确性这一最大技术风险被聚焦验证。
- 代价：普通用户最直观的图像入口延后到 V2；相术相关的 image 类型、Vision capability 等保留为前瞻 spec（不进入 V1 公开 API）。

关联：[ADR-0002](./0002-deterministic-calc-separation.md)、[ADR-0004](./0004-plugin-skills-architecture.md)
