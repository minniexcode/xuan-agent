# ADR-0001：TypeScript-first + 单 npm 包（CLI + SDK 一体）

- 状态：已采纳（Accepted）
- 日期：2026-10-15

## 背景（Context）

V1 的交付形态是 CLI + SDK + 可复用核心，面向个人工具验证与后续开源分发。早期 PRD 以 `lunar-python` 为排盘库示例，隐含 Python 栈；但 CLI、npm 分发、类型声明、SDK 复用、IDE/Web 集成都更契合 TS/npm 生态。同时需决定单包还是 monorepo。

考虑过的方案：

- TypeScript-first + 单 npm 包（选定）
- Python 为主栈，CLI 用 Python 打包
- TypeScript monorepo（workspace 多包）

## 决策（Decision）

主栈采用 TypeScript（Node.js runtime），交付为单个 npm 包 `xuan-agent`，同时承载 CLI（`xuan`）与 SDK（`import { createXuanAgent }`）。V1 不拆 monorepo。Python 不进入 V1 默认依赖，仅作为确定性计算能力不足时的后备 adapter 方向。

## 后果（Consequences）

- 正面：CLI 与 SDK 复用同一核心；npm 安装/开源分发便利；调用方获得稳定类型。
- 代价：需要 TS 生态的排盘库（`lunar-typescript`），且必须通过样例集验证其精度；放弃 Python 生态更成熟的排盘实现，必要时经 `BaziCalculator` 接 Python adapter。

关联：[ADR-0003](./0003-lunar-typescript-bazi-calculator.md)
