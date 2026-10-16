# 玄枢（xuan-agent）功能需求规格

## 文档信息

- 状态：Draft
- 文档定位：详细功能需求规格。`prd.md` 只保留每条 FR 的索引（目标 + 验收要点），完整规格在此展开。
- 上游文档：`prd.md`
- 版本范围：V1 / Personal Tool Validation

---

## 通用约定

### 输入处理：追问澄清 vs 程序报错

玄枢是 Agent，不是表单校验器。用户**输入**的问题（信息缺失、日期含糊）不是错误，而是"信息还没收集完"，应由 Agent **追问澄清**，而不是报错。

| 路径 | 缺项 / 歧义时的行为 |
| --- | --- |
| 交互路径（CLI 交互、后续对话） | Agent 追问补全 |
| 程序路径（SDK 调用） | 返回 `VALIDATION_ERROR`（调用方本应传完整数据） |

`XuanError` 只留给**程序性失败**：排盘失败、Provider 未配置、文件不可读、安全拦截等。

### V1 定位：个人自用、happy path 优先

V1 面向开发者个人使用，输入基本是完整、明确的。因此：

- 需求以 **happy path** 为准；
- 产品级边界（不确定时辰的完整体验、闰月、真太阳时等）留到 V2；
- 对 V1 用不到的输入，只做**防御性处理**（不崩、标 `limitations`），不铺完整 UX。

---

## FR-BAZI-01 出生信息采集

### 目标

采集完成八字排盘所需的最小信息。信息缺失或歧义时由 Agent 追问补全。

### 输入字段

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| 出生日期 | 是 | 公历 `YYYY-MM-DD`；农历输入需标明历法。 |
| 出生时间 | 是 | `HH:mm`，精确到分。 |
| 性别 | 是 | 用于大运顺逆。 |
| 历法类型 | 是 | `solar` 或 `lunar`。 |
| 出生地 | 否 | V1 仅作备注，不参与计算。 |
| 输出模式 | 否 | `beginner` 或 `advanced`；CLI 默认 `advanced`。 |

### 处理规则

1. 必填项缺失 → 交互路径追问补全（**V2**）；程序路径返回 `VALIDATION_ERROR`（V1 CLI 走程序路径）。
2. 日期含糊（如 `03/04/1995`）→ 追问澄清，**不猜**。
3. 农历输入 → 在输出中标明已按农历换算。
4. 出生地留空 → 不报错、不影响排盘。
5. 农历输入支持闰月（用负月份表示，如 `-4` = 闰四月）。

### 防御性处理（V1 不做成功能）

V1 个人使用不会触发，仅保证 schema 不崩：

- 时辰缺失/不确定 → 不生成时柱，`limitations` 标注"时柱缺失，精度受限"。
- 性别为 `unspecified` → 不生成大运，`limitations` 标注。

### 验收标准

- 日期、时间、性别、历法齐全时，生成 `BirthInput` 并进入排盘。
- 含糊日期时 Agent 追问，不产生排盘。
- 交互路径缺必填项时追问；程序路径缺必填项时返回 `VALIDATION_ERROR`。
- 出生地留空不报错。

### 明确不做（V2）

- 不确定时辰的完整体验（"只知道大致时段"等）
- 真太阳时校正
- 性别 `unspecified` 的正式支持

---

## FR-BAZI-02 确定性排盘

### 目标

用确定性排盘库完成八字计算，产出结构化 `BaziChart`。LLM 不得生成四柱或推导干支。

### 输入

`BirthInput`（见 FR-BAZI-01）。

### 输出字段范围（V1）

- 四柱：年柱、月柱、日柱、时柱（含天干、地支）
- 藏干
- 日主
- 五行分布
- 十神关系
- 大运：默认 **8 步**
- 神煞：**V1 不提供**（库无命盘神煞，自研成本高，移 V2）
- 排盘来源与版本（library / version / generatedAt）
- 节气信息、流年（最近 10 年）：**V2**（见 ADR-0012）

### 处理规则

1. 排盘先于 LLM；失败即返回明确错误，不进入解读，不得编造。
2. 业务层只依赖 `BaziCalculator` 接口，不直接使用 `tyme4ts` 原始对象。
3. 库无法提供的字段显式标记缺失/unsupported，不得由 LLM 补全。
4. 输出标注排盘来源（`tyme4ts` + 版本）。
5. 大运步数与流年范围做成参数：**V2**（V1 固定 8 步，见 ADR-0012）。
6. 出生时间落在 23:00–23:59 时，必须在 `limitations` 中标注所用的晚子时流派。

### 库能力核查（`tyme4ts` 1.5.3）

- **八字 API**：`SolarTime.fromYmdHms(...).getLunarHour().getEightChar()` → `EightChar`；四柱取 `getYear/Month/Day/Hour()`，每柱为 `SixtyCycle`。日主 = `getDay().getHeavenStem()`。
- **每柱可取**：天干、地支、**藏干**（`EarthBranch.getHideHeavenStems()`）、纳音（`getSound()`）、旬（`getTen()`）、**十神**（`HeavenStem.getTenStar(other)`）、地势（`getTerrain()`）、地支合害。
- **命宫 / 身宫 / 胎元 / 胎息**：`getOwnSign()` / `getBodySign()` / `getFetalOrigin()` / `getFetalBreath()`。
- **大运**：`ChildLimit.fromSolarTime(solarTime, gender)` → 起运信息、`isForward()`、`getStartDecadeFortune()`；`DecadeFortune` 可 `next()` 迭代，含 `getSixtyCycle()` 与 `getStartAge()`。
- **性别**：`Gender.MAN` / `Gender.WOMAN`。
- **农历 / 闰月**：支持；`LunarHour.fromYmdHms(y, m, d, h, m, s)`，闰月用负月份表示（`-4` = 闰四月）。
- **子时流派**：库默认"晚子时日柱算**次日**"；提供多个 provider（如 `DefaultEightCharProvider` / `LunarSect2EightCharProvider`）可切换。
- **真太阳时**：未提供 API，需外部计算 → V2。
- **神煞**：仅有黄历级内容（`God` / `Duty` / `Taboo` 等），**无命盘神煞** → V1 不做。

### 验证结论（2026-10）

三实现交叉对拍 21 例（`tyme4ts` / `lunar-typescript` / `cnlunar`）：`tyme4ts` 与 `lunar-typescript` 结果一致，节气时刻与权威值**逐秒吻合**；`cnlunar` 节气有误，已排除。详见 `product-architecture.md` §11。

### 流派开关

**晚子时日柱**（23:00–23:59）：V1 默认**算次日**（23:00 换日）。

- 理由：与主流排盘软件一致——问真、元亨利贞、易运盘、问道八字、卜易居**均默认次日**（问真已通过其线上接口验证）；`tyme4ts` 默认也是次日。注意古典**历法**传统主张"子正换日"（即当日），与术数**排盘**的通行实践相反，故此项需保留可切换。见 [ADR-0010](adr.md)。
- 切换方式：`LunarHour.provider` —— `DefaultEightCharProvider` = 次日（默认），`LunarSect2EightCharProvider` = 当日。注意这是 `LunarHour` 的**静态属性**，不是 `EightChar` 上的开关。
- **术语警告**：各来源对"早子时 / 晚子时"的定义不一致（问真的定义甚至与常见用法相反）。**代码与规格只按 23:00 边界与"当日 / 次日"表述，不得用这两个词做判断逻辑。**

**起运算法**：按库默认。

### 验收标准

- 生成结构化 `BaziChart` 后再进入 LLM。
- Prompt 含结构化 `BaziChart`，而非仅生日字符串。
- 排盘失败返回明确错误，不产生解读。
- 输出标明排盘来源。
- 节气边界用例与权威节气时刻一致（已验证，见 `product-architecture.md` §11）。

### 明确不做（V2）

- 神煞（需自研）
- 流日
- 真太阳时校正
- 流派差异的完整处理（格局判定等）

---

## FR-BAZI-03 通俗模式解读

### 目标

面向普通用户输出低门槛、生活化、非断言的解读。V1 用于提前验证"少术语、不吓人"的表达能否做到；V2 由前端默认使用。

### 输出结构（V1 收敛）

`AnalysisResult.content.sections` 结构化输出，通俗模式的 section 为：

- 关键词（3–5 个）
- 整体摘要
- 若干观察点（性格 / 行为 / 沟通 / 关系 / 成长中择要，**不硬性全列**）
- 可继续追问的问题
- 边界提醒

### 表达要求

- 少术语；出现术语必须解释，或用生活化说法替代。
- 语气温和克制，不制造焦虑。
- 可用"倾向""观察角度""传统语境下可以理解为"等表达。
- 不给用户贴固定人格或命运标签。

### 处理规则

1. 输出结构化 section，非自由文本。
2. 每次输出必须含边界提醒。
3. 术语默认不出现；用户追问时才展开（见 FR-BAZI-05）。

### 验收标准

- 不懂天干地支、十神，也能读懂主要结论。
- 不出现"必然""注定""一定发财""大凶"等断言。
- 每次输出含边界提醒。
- 输出可被 CLI 按 section 渲染。

### 明确不做（V2）

- 前端专属的轻量卡片 / 分享形态

---

## FR-BAZI-04 进阶模式解读

### 目标

面向有基础用户，展开术语、结构与依据。CLI 默认使用此模式。

### 输出结构（V1）

`AnalysisResult.content.sections` 结构化输出，进阶模式的 section 为：

- 四柱结构
- 日主与月令
- 五行分布与生克
- 十神组合
- 大运 / 流年观察维度
- 边界提醒

### 处理规则

1. 结构化 section 输出，非自由文本。
2. 术语直接使用，不逐条解释；需要时由用户追问（见 FR-BAZI-05）。
3. 一次请求只出**一种**模式（`beginner` 或 `advanced`）；不生成"两份并互相映射"。
4. CLI 默认 `advanced`。

### 验收标准

- 不得只重复通俗模式，至少展开 4 类专业维度（四柱 / 日主月令 / 五行生克 / 十神）。
- 含边界提醒。
- 输出可被 CLI 按 section 渲染。

### 明确不做（V1）

- 格局判定（流派差异大）——V1 最多泛谈"结构倾向"
- 神煞（见 FR-BAZI-02）
- 与通俗模式的"对应关系"（换模式即同盘重跑）

---

## FR-BAZI-05 追问与同盘复用

### 目标

在一次分析后继续追问，复用同一份排盘结果。

### 支持类型（V1）

- 解释术语（如"什么是正印？"）
- 解释判断（如"为什么说财星明显？"）
- 改写输出风格（"说人话""专业一点"）
- 切换输出模式（通俗 ↔ 进阶）

"切换 Provider 对比"属 V1 后能力，V1 不做。

### 会话续接（CLI）

- `xuan bazi analyze` 结束时输出 session id。
- `xuan bazi ask --session <id> --question "..."` 续接。
- 不传 `--session` 时**默认续最近一次会话**；`--new` 开新会话（**V2**，见 ADR-0012）。

### 处理规则

1. 同一会话内必须复用已存的 `BaziChart`，不得重新排盘。
2. RAG **按需**触发：仅当追问涉及术语或依据时检索，不是每轮都检。
3. 术语解释结合当前盘面，而非只给百科定义。
4. 切换输出模式只改 Prompt，不改排盘。
5. 找不到会话上下文时返回明确错误。

### 验收标准

- 同一会话内追问复用同一份排盘。
- 术语解释结合当前盘面。
- 切换输出模式保留同一份结构化排盘。

### 明确不做（V1 后）

- 切换 Provider 对比

---

## FR-MEM-01 会话记忆

### 目标

本地保存会话上下文，支持连续追问。

### 保存内容

- 当前 Skill
- 当前用户问题
- 当前 `BaziChart`
- 当前输出模式
- 当前 Provider 与模型
- 本轮 RAG 命中摘要
- session id

### 处理规则

1. 每次 `analyze` 后**自动**写入本地会话（追问依赖它，必须存）。
2. **不做自动过期**；提供 `xuan session clear` 清理。
3. 会话状态不保存完整图片二进制。
4. 新会话（`--new`）默认不读取上一会话内容。

会话是短期本地缓存（含盘面输入），服务同盘追问；它与需显式确认的长期档案（FR-MEM-02）是两回事——见 ADR-0012 与 ADR-0008。

### 验收标准

- 同一会话追问能引用前一轮分析结果。
- 会话文件位于本地 user-data-dir，可被清理。

---

## FR-MEM-02 用户档案

### 目标

显式保存长期档案。出生信息回填（省去重复输入）为 **V2**（见 ADR-0012）。

### V1 范围（极简）

- 本地 ID（档案主键）
- 出生信息
- 偏好（输出模式、Provider）

### 处理规则

1. **默认不写档案**（默认临时模式）。
2. 首次保存前必须用户确认。
3. 可查看、更新、删除。
4. 存储为本地 JSON。

### 明确不做（V1）

- 历史分析摘要
- 常问主题
- 备注
- 昵称

---

## FR-RAG-01 知识库内容管理

### 目标

V1 只做知识库**管线与契约**；内容等有数据后灌入。

### V1 范围

- seed 用**几条示例**占位。
- 每条知识记录来源与版权状态。
- 支持增量更新（本地知识库可覆盖 / 扩展 seed）。

### 处理规则

1. 每条知识必须记录来源名称、内容类型、版权状态。
2. `copyrightStatus` 为 `unknown` / `restricted` 的资料不进核心知识库。
3. 本地知识库优先级高于包内 seed。

### 明确不做（V1）

- 完整知识库内容（等数据）

---

## FR-RAG-02 检索与引用

### V1 范围

- `xuan rag search --query` 命令。
- 引用格式：区分**原文 / 现代释义 / Agent 总结**三者。
- 检索：**关键词检索**起步（向量索引留技术设计阶段）。

### 处理规则

1. 无可靠命中 → 明确说明"未检索到明确依据"，**不得伪造出处**。
2. 通俗模式只给简短来源；进阶模式可展开原文与释义。
3. 引用服务解释，不大段堆砌。

### 验收标准

- `xuan rag search` 返回带来源的引用。
- 引用输出区分原文、释义、总结三类。

---

## FR-LLM-01 Provider 配置

### V1 范围

- 通过 `.env` 配置：Provider、模型名、API key、Base URL、温度、是否启用 Vision、是否启用 streaming。
- V1 单一 Provider：`openai-compatible`（DeepSeek）。

### 处理规则

1. API key 不得打印、不得写入日志或普通输出。
2. `xuan config doctor` 只显示 key **是否存在**，不显示内容。
3. 配置缺失时返回明确错误。

---

## FR-LLM-02 Provider 工厂与统一调用

### V1 范围

- `ProviderFactory` + 自研 `LlmProvider`（openai-compatible adapter 直接 `fetch`，见 ADR-0011）。
- 实现 `openai-compatible`；`anthropic` 保留骨架。
- 暴露 capability（text / vision / streaming / structuredOutput）。

### 处理规则

1. 新增 Provider 不得改动八字排盘或业务逻辑。
2. Provider 错误必须映射为标准 `XuanError`。
3. Vision 不可用的 Provider 不得进入图像流程（V2 相术）。

---

## FR-LLM-03 多 Provider 对比（V1 后）

V1 不交付。V1 完成后复用同一份 `BaziChart`，并列输出不同模型结果并标注来源，不做自动评分。

---

## FR-SKILL-01 V1 Skills 注册

> **V2**：Skill 注册机制移入 V2（见 ADR-0012，取代 ADR-0004 对 V1 的生效义务）。V1 的 `bazi` / `profile` / `rag` 以 `XuanAgent` facade 方法形式提供，不构成 `SkillRegistry`。

| Skill | 档位 | 说明 |
| --- | --- | --- |
| `bazi` | V1 交付 | 八字排盘与解读。 |
| `profile` | V1 交付 | 用户档案与偏好管理。 |
| `rag-reference` | 骨架 | 检索管线与引用契约就绪，内容待数据。 |
| `provider-compare` | 骨架 | 多 Provider 对比，V1 后。 |

每个 Skill 必须声明：`name`、`description`、`inputSchema`、`outputSchema`、`requiredCapabilities`、`safetyRules`、`execute(context, input)`。

### 处理规则

1. 每个 Skill 必须能被 CLI 与 SDK 复用。
2. Skill 失败时返回结构化错误，不影响其他 Skill 注册。

---

## FR-SKILL-02 后续扩展规则

> **V2**：随 Skill 注册机制一并延后（见 ADR-0012）。

新增相术、六爻、紫微、奇门等模块时，通过新 Skill 扩展。

### 处理规则

1. 新 Skill 不得要求重写核心 Agent 流程。
2. 新 Skill 复用统一的会话、档案、Provider、RAG 与 Safety 能力。
3. 新 Skill 若含确定性计算，必须先用库 / 规则算完，再交给 LLM 解读。
