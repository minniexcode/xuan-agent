# ADR-0003：排盘库选 `lunar-typescript`，经 `BaziCalculator` 接口隔离

- 状态：已采纳（Accepted）
- 日期：2026-10-15

## 背景（Context）

在 TypeScript 栈下需要一个八字排盘库。直接让业务层依赖第三方库对象会带来耦合：库的 API/对象结构一旦变化或精度不足，会波及 CLI、SDK、Skill、LLM 解读全链路。

考虑过的方案：

- `lunar-typescript`（选定）
- 自研 `BaziCalculator` 规则引擎
- Python adapter 接入 `lunar-python`（后备）

## 决策（Decision）

默认采用 `lunar-typescript` 完成八字计算，通过 `BaziCalculator` 接口暴露标准化的 `BaziChart`（含排盘来源与版本）。业务层不得直接依赖 `lunar-typescript` 原始对象。当 `lunar-typescript` 在节气、大运、流年、神煞或流派差异上无法通过样例校验时，只允许修改 calculator 或替换库 / 接 Python adapter，不允许让 LLM 补算。

## 后果（Consequences）

- 正面：排盘库可替换、可测试；`BaziChart` 成为稳定契约；精度风险被隔离在 adapter 层。
- 代价：多一层 adapter 抽象；`lunar-typescript` 的精度必须建立样例集交叉验证（以问真等独立工具为金标准）。

关联：[ADR-0002](./0002-deterministic-calc-separation.md)
