# 06 · Vision 接入点

> [导览索引](README.md) · 上一份 ← [05-测试与Review](05-测试与Review.md) · 下一份 → [07-版本变更](07-版本变更.md)

V1 review 通过后要做"V1 增强版，为 Vision 加入做准备"。好消息是**现有架构的预留比较充分**，主要工作不是重构而是填充。按改动从易到难：

---

## A. 已经预留好的（不用改）

| 位置 | 预留 |
| --- | --- |
| `ProviderCapabilities.vision` | 字段已在（`provider.types.ts:5`），恒 false |
| `AnalysisResult<TStructured>` | **泛型**，可直接装 `XiangshuObservation` |
| `RagCitation` / `KnowledgeDomain` | 已含 `"face" \| "palm"` 域 |
| `config.enableVision` | 配置项已在，`diagnoseConfig` 会警告"V1 不交付" |
| `technical-design.md` §21.3 | 相术 workflow 的完整节点图已写好 |

---

## B. 需要新增的

1. **`LlmProvider.invokeVision()`** —— §22.2 已定义签名，未实现。需要处理图片编码（base64 / data URL）与多模态消息格式。**注意**：现有 `TextLlmInput` 只支持纯文本消息，Vision 需要一个平行的 `VisionLlmInput`。
2. **图像输入校验** —— 文件可读性、格式、大小；`Provider.capabilities.vision === false` 时必须**终止**（§21.3 硬性规则）。
3. **`SafetyGuard` 图像规则** —— 身份识别、敏感属性推断、疾病判断、外貌价值评判。这是 V2 最大的新增风险面。
4. **新 Skill + workflow 节点** —— 按 §21.3 的 10 个节点（`validate_image_input` → … → `save_conversation_state`）。
5. **CLI `xuan xiangshu analyze`** —— 需要文件参数与 `--confirm`（"发送图片给云端 Provider"必须确认，§19.3）。
6. **`ConversationState`** —— 存"相术观察摘要"而非图片二进制（§26.2 明确）。

---

## C. 架构层面要提前想清楚的

- **Skill 抽象**：如果相术作为独立 Skill，[检查清单第 2 项](05-测试与Review.md#2-skillregistry--skill-manifest-未实现)（SkillRegistry）就**必须先做**。这是 V2 前最值得投入的一次重构。
- **多模态 Provider 抽象**：现在的 `invokeText` 是单一方法。是加 `invokeVision`（平行方法）还是把 `messages` 泛化成 content block 数组（更通用但要改所有 adapter）？这个选择会影响后续所有 Provider。
- **`xuan-agent.ts` 的体积**：338 行已经不小，再加相术流程会明显膨胀。V2 前把 workflow 拆成 `src/workflows/`（目录在 §14.3 已规划）是合理时机。
- **`content.sections`**：[检查清单第 1 项](05-测试与Review.md#1-contentsections-恒为空-) 的缺口在 V2 会更痛 —— 相术输出同样需要结构化 section（观察维度、置信度、边界提醒）。建议在做 Vision 之前先把它解决掉，否则 V2 要在两处补同样的洞。

---

> 下一份 → [07-版本变更](07-版本变更.md)：V1 → V2 的演进记录
