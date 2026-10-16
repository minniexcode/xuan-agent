# V1 Scope 与文档符合性审查

- 审查日期：2026-10-16
- 代码基线：`04bdc41`，审查开始时工作区干净。
- 审查性质：按现有需求、架构与 ADR 核对实现，并纳入用户在审查讨论中明确的职责边界；本文不自动改写上游规格。
- 结论：**V1 主链路可运行。按用户已明确的个人 CLI/SDK 用法，安全结果返回和同盘追问可接受；知识条目与计算库的差异暂不判错。这三项不要求修改业务代码。其余原始文档承诺与实现的差异仍保留，不能据此推断所有契约均已满足。**

## 1. 审查依据与边界

依据顺序为 [PRD](prd.md) → [详细需求](requirements.md) → [产品架构](product-architecture.md) → [技术设计](technical-design.md)，已采纳 ADR 用于解释或变更架构决定。代码导览描述实现现状，不能自行取消上游验收条件。

- ADR-0011 明确取代 ADR-0005，因此自研 Provider 与线性编排是有文档依据的选择；没有 LangChain / LangGraph 不算实现缺失。
- ADR-0004 的 SkillRegistry 要求仍有效，未找到取消或延期该要求的 ADR。
- 相术、真实 Vision 流程、多 Provider 对比、前端、账号支付、HTTP API 交付、完整知识库内容、向量检索、神煞、真太阳时均不作为本次 V1 缺口。
- HTTP API 骨架缺失可记为设计清理项，但按 PRD“非验收交付物”的约定，不阻塞 V1。
- 不把未知时辰等 V2 完整体验强加到 V1；但仍检查 V1 承诺的防御性处理是否会生成虚构数据。
- 用户在审查讨论中明确：CLI 为个人使用，CLI/SDK 负责返回分析内容和安全检查结果；面向用户的服务另行决定展示、改写、降级或拦截。因此，返回原文及 `safety.blocked=true` 是允许的结果契约，不要求 CLI/SDK 隐藏原文，也不要求修改该字段。原 R01 的代码整改要求撤销，保留文档职责同步项。
- 用户进一步明确：不接受仅凭单一计算库输出将知识条目判为错误；当前同盘追问满足 V1 用法。因此，R02 改为待核对差异，R05 撤销功能修复要求，不以补充历史回答记忆作为本轮整改条件。

`git log --reverse` 显示，初始文档、技术设计、V1 范围调整和排盘选型提交早于 Milestone 1 实现，说明项目确实先建立了文档。当前主要问题是：**实现偏离后，部分偏差仅写入代码注释和导览，没有完成需求变更或验收闭环。**

## 2. 需求追踪矩阵

“部分完成”表示存在可用实现，但至少一项当前验收条件未满足；不以文件存在或测试通过代替验收。

| 需求 | 状态 | 已实现 | 未满足或待确认 |
| --- | --- | --- | --- |
| FR-BAZI-01 出生信息采集 | 部分完成 | SDK schema、完整输入、未知时辰/未提供性别的常规防御路径 | CLI 不追问；非法日期未做日期有效性校验；`timeUnknown:false` 可伪造时柱；农历换算未在文本明确说明 |
| FR-BAZI-02 确定性排盘 | 部分完成 | 四柱、柱内藏干、日主、五行、十神、8 步大运、来源版本；21 例基线通过 | 节气信息、最近 10 年流年缺失；步数/范围不可配置；晚子时无切换入口；库异常未统一为 XuanError |
| FR-BAZI-03 通俗解读 | 部分完成 | 模式 Prompt、固定边界提醒、安全检查及标记返回 | sections、关键词、追问问题无结构化实现；表达质量未通过真实模型验收 |
| FR-BAZI-04 进阶解读 | 部分完成 | advanced 默认、专业术语 Prompt、RAG 注入 | sections 为空；未约束并验证四类专业维度；流年输入缺失；`both` 契约冲突 |
| FR-BAZI-05 追问与同盘复用 | 同盘追问已实现；附加条款有差异 | 复用冻结盘面、指定/最近会话、显式 mode 切换；用户认可当前追问 | 每轮都调用 RAG；自然语言模式切换无显式状态处理；`--new` 不存在；这些条款是否保留需与个人工具范围对齐 |
| FR-MEM-01 会话记忆 | 部分完成 | 本地自动保存上一轮盘面、最近会话指针、无自动过期、清理命令 | analyze 忽略并不保存 request.question；隐私默认与上游冲突；历史回答正文不作为本轮整改要求 |
| FR-MEM-02 用户档案 | 部分完成 | 确认后 CRUD、出生信息和偏好、本地 JSON、更新保留 createdAt | 分析不加载档案及偏好，未兑现省去重复输入的目标；ID 路径穿越 |
| FR-RAG-01 知识管理 | 管线基本符合，条目差异待核对 | 4 条 seed、来源/版权元数据、本地同 ID 覆盖、版权过滤 | 两条 seed 的例子与计算库输出不一致，暂不判错或要求改写；未知来源仍可被标记 usable 纳入 |
| FR-RAG-02 检索与引用 | 部分完成 | 关键词搜索、带来源返回、数据层分开 excerpt/interpretation/summary | analyze 无命中不提示；文本输出未完整区分三类内容；通俗模式完全跳过来源 |
| FR-LLM-01 Provider 配置 | 基本符合，配置契约有缺口 | 环境变量、CLI 加载 .env、缺 key 报错、doctor 只报 key 是否存在 | 单次请求覆盖未接入；用户级配置文件优先级未实现；streaming 开关与实际能力/执行不一致 |
| FR-LLM-02 Provider 工厂 | 部分完成 | openai-compatible、mock、anthropic 明确骨架、capability、业务隔离 | 响应解析异常不是 XuanError；空/缺失回答被当成功；无真实 adapter 自动化测试 |
| FR-SKILL-01 Skills 注册 | 未完成 | bazi/profile/rag 具有对应 facade 方法 | 无 SkillManifest、SkillRegistry、统一 execute、注册/重复注册/失败隔离 |
| FR-SKILL-02 扩展规则 | 架构契约未完成 | 基础层有可复用接口，排盘库隔离 | Skill 扩展入口未实现，核心依然硬编码 bazi；无法按文档验证“新增 Skill 只需注册” |
| FR-LLM-03 多 Provider 对比 | V1 排除 | — | 不计入未完成项 |

## 3. 主要发现与复现

优先级：P1 为需要优先修正的实际输出、数据边界或核心验收问题；P2 为仍须关闭的契约、交互或工程问题。优先级不构成范围豁免。

### R01 · 已撤销：返回原文与 blocked 标记符合已澄清的职责边界

- 原判断依据：PRD 安全要求、ADR-0009、技术设计 §21.2 的重写、降级或阻断描述。初次审查把最终用户服务的处置责任放到了 CLI/SDK 层，这一整改判断不适用于用户明确的架构边界。
- 代码：`src/agent/xuan-agent.ts:221,246,290,310`；`src/cli/renderers/bazi-renderer.ts:47`。
- 行为确认：检测命中时返回 `safety.blocked=true`、warnings 和原始 content；个人 CLI 展示分析结果与安全提示。
- 用户明确的契约：CLI/SDK 提供完整结果与检查标记，面向用户的服务据此决定如何处理。`blocked` 可作为消费方的处理依据，不代表 SDK 必须停止返回原文。
- 当前结论：不作为 V1 功能缺陷或修复阻塞项，不要求增加拦截、隐藏原文、修改字段或扩大安全审查系统。
- 文档同步：上游规格需写清检测与处置的层级归属，避免后续审查再次要求 SDK 承担最终展示策略。

### R02 · 待核对：知识条目与计算库输出不一致，不直接判为内容错误

- 审查范围：FR-RAG-01 的 V1 交付是管线与契约，seed 为示例占位；条目内容的领域正确性与管线功能完成度分别判断。
- 代码：`knowledge/seed/bazi-ten-gods-zhengyin.md:13` 写“壬见庚为正印”；`knowledge/seed/bazi-ten-gods-shangguan.md:13` 写“壬见甲为伤官”。
- 本地核对：使用项目已采用的 `tyme4ts@1.5.3`，`HeavenStem.fromName('壬').getTenStar(...)` 得到：庚→偏印，辛→正印，甲→食神，乙→伤官。现有 calculator 单测也断言壬日主甲时干为食神。
- 证据边界：上述结果证明资料与当前计算库存在差异，单一库输出不足以独立裁定领域知识的正确性。原先直接断言条目错误并要求改写，结论过度。
- 当前处理：尊重用户确认，不修改知识条目，不将其计为 V1 功能缺陷或当前修复任务；未来若需核对，应先约定采用的领域资料和判断依据。

### R03 · P1：档案和会话 ID 可穿越存储目录

- 依据：PRD 隐私与本地存储边界；档案/会话 ID 应是标识符，不应变成任意文件路径。
- 代码：`src/profiles/profile-store.ts:12`、`src/conversations/conversation-store.ts:17` 直接 `join(dir, id + '.json')`，schema 只检查非空。
- 复现：在专用临时数据目录调用 `saveProfile({userId:'../escaped', ...}, {confirm:true})`，实际生成 `<dataDir>/escaped.json`，超出 `<dataDir>/profiles/`。验证没有写入真实用户数据。
- 影响：同一路径构造用于读取和删除；`--confirm` 只确认操作，没有限制文件目标范围。SDK request.sessionId 也可进入会话文件路径。
- 关闭条件：统一校验 ID，拒绝目录分隔符、`.`/`..` 等非法值，并验证最终路径仍在指定存储目录内；覆盖保存、读取、删除。

### R04 · P1：通俗/进阶结构化输出未实现

- 依据：FR-BAZI-03/04 明确要求结构化 section，并可以按 section 渲染；通俗模式还要求 3–5 个关键词和可继续追问的问题。
- 代码：`src/agent/xuan-agent.ts:170` 固定 `sections:[]`，下一行固定 `followupQuestions:[]`；`src/prompts/prompt-manager.ts:56` 未定义对应输出契约；CLI 只渲染 summary。
- 复现：SDK 与构建后的 CLI `--json` 均返回空 sections。不是单纯的 Markdown 显示风格差异。
- 关闭条件：明确并校验各模式输出 schema，填充 sections/追问建议，CLI 依据结构渲染；进阶至少覆盖详细需求规定的四类专业维度。

### R05 · 已撤销：同盘追问已实现，历史回答引用不作为本轮整改要求

- 原判断依据：将 FR-MEM-01“引用前一轮分析结果”直接理解为引用上一轮解读正文，扩大了对当前同盘追问的验收要求。
- 代码：`src/conversations/conversation-state.ts:16` 起的状态只有盘面、当前问题等字段；`src/prompts/prompt-manager.ts:84` 只传盘面、当前追问、当前引用与模式。
- 复现：首次假 Provider 回答带唯一标记，接着问“说人话”；捕获第二次 Provider 输入，找不到该标记或上一轮回答。第二轮保存还会覆盖当前 question。
- 能力判断：当前输入具备冻结盘面、当前问题、引用及模式，能够支持围绕同一盘面的术语解释、继续提问和按风格重答。没有上一轮回答正文不等于没有追问功能。
- 能力边界：明确指代“刚才第二段”等历史文本时没有对应正文上下文；用户认可现有同盘追问，不要求为 V1 增加这种能力。
- 当前处理：认可同盘追问已实现，撤销原功能修复要求；不新增历史回答存储或多轮对话系统。

### R06 · P1：排盘输出范围与可配置约定缺失

- 依据：FR-BAZI-02 列出节气信息、默认最近 10 年流年、可配置的大运步数与流年范围；ADR-0010 要求流派可切换。
- 代码：`src/schemas/bazi.ts` 无 solarTerms/annualFortune 字段；calculator 返回值也没有；`src/calculators/tyme4ts-calculator.ts:26` 固定 8 步，接口没有参数；第 132 行却宣称流派“可切换”。
- 注意：当前 `docs/technical-design.md:399` **已有** `annualFortune?: AnnualFortune[]`，代码导览所说“技术设计也没有流年字段”不符合现有文件。
- 关闭条件：补齐确定性字段与参数，或先正式调整上游 V1 范围；不能只在导览把它们记为“个人自用无妨”。“最近 10 年”的锚点也需先明确。

### R07 · P1：没有出生时间时仍可能生成一个确定时柱

- 依据：FR-BAZI-01 防御性处理要求缺失/不确定时辰不生成时柱。
- 代码：`src/schemas/index.ts:61` 只比较字段是否 undefined；`src/calculators/tyme4ts-calculator.ts:50,55` 默认取 12:00，再用 `!timeUnknown` 判断时辰已知。
- 复现：`{date:'1995-03-12',gender:'male',calendar:'solar',timeUnknown:false}` 不带 time，schema 验证通过，最终返回 `hourStatus:'known'` 和 `丙午` 时柱。
- 关闭条件：缺 time 时仅接受明确的 `timeUnknown:true`，或按约定返回缺失时柱；不能把内部计算锚点作为真实出生时间输出。

### R08 · P2：SkillManifest / SkillRegistry 没有实现

- 依据：FR-SKILL-01/02、ADR-0004、技术设计 §23。
- 代码：无 `src/skills/`；`src/agent/xuan-agent.ts:163` 以及会话保存硬编码 bazi。SDK options 无 skillRegistry。
- 影响：对应业务方法存在，不等于具备文档要求的注册、schema、capability、安全规则和失败隔离。
- 关闭条件：实现最小可用注册机制及 bazi/profile、约定骨架；验证重复注册和失败隔离。若要延期，须先通过正式范围变更更新需求、架构与 ADR。

### R09 · P2：错误类型不满足 SDK 统一契约

- 依据：FR-BAZI-02、FR-LLM-02、技术设计 §18、§22。
- 代码：`src/agent/xuan-agent.ts:209` 不包装计算库异常；`src/providers/openai-compatible.adapter.ts:108` 在 try/catch 外解析响应。
- 复现：`1995-02-31` 和 `1995-13-12` 通过格式 schema 后抛原生 Error，无 code；HTTP 200 但正文为非 JSON 时抛 SyntaxError，无 code；正文 `{}` 则成功返回 `{text:''}`。
- 关闭条件：无效日期返回 `VALIDATION_ERROR`；有效输入的排盘故障返回 `CALCULATION_ERROR` 且不调用 LLM；Provider 网络/协议/解析/空回答故障返回 `LLM_ERROR`。

### R10 · P2：SDK 单次请求字段与档案偏好没有进入执行链

- 依据：技术设计 §17.4、§18、§21.2、§25.2，以及 FR-MEM-02 的复用出生信息目标。
- 代码：`AnalysisRequest` 声明 question、provider、model、userId、saveToProfile，但 analyze 主要只读 mode、sessionId、temporary；getProvider 仅使用构造时 config。分析不调用 ProfileStore。
- 复现：传唯一 question 标记后，LLM Prompt 不含该标记。保存 beginner 档案后，`analyzeBazi(birth,{userId:'me',temporary:true})` 仍返回 advanced。
- 说明：注入 Provider 本来就会覆盖工厂；忽略 request.provider/model 的判断来自代码路径，未把注入优先级误当作错误。
- 关闭条件：明确请求与档案的优先级并实现有效字段；不能支持的字段应从契约移除或明确拒绝。保存仍需符合显式确认要求。

### R11 · P2：CLI 缺失需求中的交互和参数

- 依据：FR-BAZI-01、FR-BAZI-05、FR-MEM-01、技术设计 §19。
- 代码：`src/cli/commands/bazi.ts` 使用 requiredOption，无交互补全；无 --new、--provider、--model、--save-profile。
- 复现：缺参数直接由 commander 退出；含糊日期输出 VALIDATION_ERROR 后退出；`bazi ask --new`、`bazi analyze ... --provider mock` 都报 unknown option。
- 关闭条件：按文档实现 CLI 追问/澄清与参数，区分非交互调用；或先正式收窄交互需求。ask 的新会话行为需先定义：没有盘面时从哪里获取出生输入。

### R12 · P2：RAG 的触发、无命中说明与文本引用不完整

- 依据：FR-BAZI-05 规则 2、FR-RAG-02、技术设计 §21.2。
- 代码：`src/agent/xuan-agent.ts:277` 每轮追问无条件搜索；`src/prompts/prompt-manager.ts:69` 仅在 citations 非空时附加依据段；两个 CLI 引用 renderer 都不显示 summary，分析 renderer 还不显示 interpretation。
- 复现：“说人话”的追问仍调用 search 一次。给 analyze 注入空知识库，LLM 输入没有无依据说明，返回值/文本 renderer 也没有保证该提示。`rag search --query 正印` 的文本只显示原文、释义、标签，没有 Agent 总结。
- 关闭条件：真正按需检索；执行过检索却无可靠命中时，在结果及用户可见文本明确告知；引用展示区分原文/释义/总结；通俗模式的来源策略先与需求对齐。

### R13 · P2：CLI 输出与分层契约有偏差

- 依据：技术设计 §14.2、§19.2。
- 复现：临时空数据目录中运行 `profile view --json`，stdout 是“未找到档案：default”，退出 0，不能 JSON.parse。
- 代码：`src/cli/commands/profile.ts:51` 在检查 --json 前返回文本；`src/cli/renderers/bazi-renderer.ts:46` 只有模型名，没有文档要求的 Provider 名/Skill；`src/cli/main.ts:29` 错误不提供恢复建议。
- 分层：`src/cli/commands/session.ts` 直接访问 ConversationStore；`src/cli/commands/provider.ts` 也直接 import 内部 provider-catalog，而非从公开 SDK 获取。
- 关闭条件：所有 --json 成功分支保持 JSON；必要元信息和错误建议齐全；清理会话等操作经统一 facade/公开 API。

### R14 · P2：声明 Node >=20，直接运行依赖却要求 >=22.12

- 依据：README、技术设计与 `package.json:28` 声明 Node >=20。
- 证据：直接依赖 commander 是 15.0.0，`package-lock.json:1573` 及已安装包的 engines.node 都是 `>=22.12.0`。
- 影响：声明支持的部分 Node 环境违反依赖引擎要求；启用 engine-strict 时会安装失败。此次在 Node v24.21.0 通过构建，不能证明 Node 20 支持。
- 关闭条件：按文档保留 Node 20 并选择兼容依赖，或先更新运行时决策/文档/engines，再验证最低支持版本。

### R15 · P2：可观测性与脱敏承诺只部分落地

- 依据：产品架构 §10、PRD 可观测性，以及 ADR-0008。
- 代码：业务链只有 `src/agent/xuan-agent.ts:141` 的一次创建 debug 日志；没有约定的校验、排盘、RAG、LLM、审计、存储阶段及命中/来源记录。
- 脱敏：`src/logging/redaction.ts` 只按 apiKey/token/password 等密钥名处理；birth/date/time/place/profile 等不会被自动脱敏。没有把“当前业务未记录这些字段”误报成已经发生的数据泄露，但通用 logger 尚不能兑现相关防护承诺。
- 关闭条件：补齐必要且脱敏的事件；验证出生信息、出生地、档案及嵌套对象不会被 logger 原样记录。

## 4. 必须先统一的文档冲突

| 冲突 | 当前证据 | 文档先行的处理方式 |
| --- | --- | --- |
| 安全检查与最终处置的层级归属 | 原规格的重写、降级或阻断描述未区分层级；用户已明确 CLI/SDK 返回原文与检查标记，另一个面向用户的服务负责处置 | 按已明确的职责更新上游描述；保留当前 `blocked` 标记及原文返回行为，不要求通过增加 CLI/SDK 拦截来对齐旧表述 |
| 隐私默认 vs 自动会话保存 | ADR-0008 / README / 架构 §8.3 不默认永久保存出生信息；FR-MEM-01 要求自动保存且不自动过期。实现保存含 `chart.input` 的会话，CLI 没有 temporary 开关 | 明确短期会话与长期档案定义、默认持久化/保留策略、退出机制和用户提示；记录正式决定再落实代码。仅“本地保存”或“可以清理”不能自动消除冲突 |
| 单模式 vs both | 需求 FR-BAZI-04 要求每次一种模式；PRD/字段表/技术设计枚举/CLI 仍允许 both；实现将 both 按 advanced 指令处理 | 决定是否保留 both，再统一 schema、CLI、Prompt 与验收；当前不能宣称有双模式同时输出 |
| 进阶维度数量 | PRD FR-BAZI-04 写至少 3 类；详细需求写至少 4 类 | 统一上游索引与详细验收。本审查按详细需求四类记录，保留冲突标记 |
| 进阶 RAG 范围 | FR-BAZI-04 “明确不做”列 RAG；FR-RAG-02 规定进阶引用；实现注释直接称前者 stale | 正式修订需求，明确 RAG 是否属于 V1 分析链；代码注释不能替代需求变更 |
| LangChain/LangGraph | FR-LLM-02 和技术设计部分目录仍写旧框架；ADR-0011 已取代旧决定 | 按 ADR-0011 清理残留描述，不要求把旧框架补回代码 |
| 已完成声明 vs 已知缺口 | README、CLAUDE、tour 索引宣称已完成；tour/05、07 同时列结构化输出、Skill、流年等未实现 | 状态改成可核验的“主链路可运行、V1 验收未完成”；有验收证据后再标完成 |
| 流年与里程碑记载 | tour/05 称技术设计无 annualFortune，实际已有；技术设计 M5 仍写相术移 V2，tour/07 M5 写档案与 Provider | 校正导览与实施里程碑，不用已完成的里程碑数量推断 FR 已完成 |

上述冲突需要范围/行为决定，不宜在修复过程中默认为“代码就是最终规格”。没有找到正式取消 V1 结构化输出、流年、Skill 注册等义务的记录。

## 5. 实际执行的验证与局限

| 检查 | 结果 | 可证明的范围 |
| --- | --- | --- |
| `npm run typecheck` | 通过 | 当前 TypeScript 类型检查 |
| `npm run lint` | 通过，77 files | 当前 biome 规则；未自动修复 |
| `npm test` | 15 文件、62 测试通过 | 当前测试断言，包含 21 例排盘基线与源码级 CLI/SDK smoke |
| `npm run build` | ESM 与声明生成通过 | 本机 Node v24.21.0 / npm 11.19.0 下构建 |
| `npm run pack:dry` | 通过，18 文件 | 文件清单含 dist、seed、README、LICENSE、package、.env.example；未包含 .env、用户档案、会话或私有知识库 |
| `.env.example` key 检查 | API key 为空 | 未将该字段的真实 key 发布进模板；检查未输出密钥内容 |
| 构建产物 CLI 子进程 | 完成 | 从临时 cwd 执行真实入口，验证 seed 能找到、部分缺参/非法参数/JSON 分支/模式行为 |
| SDK 注入 Provider、RAG、Store | 完成 | 确认安全输出、结构化字段、追问输入、检索次数、请求字段处理等行为 |
| 真实本地 ProfileStore | 完成 | 在独立临时数据目录复现目录穿越和档案偏好未生效 |
| Provider HTTP 响应替身 | 完成 | 无网络验证非 JSON/空回答处理 |

没有调用真实付费 LLM，也没有向外部 Provider 发送用户资料。真实模型的中性表达、通俗可读性、四类专业维度完整性与引用忠实度，本次不能判为通过。Node 20 未实机验证。未发布 npm 包。

现有测试主要证明“当前实现可以运行”，还没有形成逐 FR 的验收测试矩阵。例如：

- followup 测试比较日主/年柱等部分字段；可加强 calculator 调用次数断言，但不要求上一轮回答正文进入 Prompt 才算同盘追问通过。
- “风格类追问不触发 RAG”的测试只断言没有 citation，没有断言 search 不被调用。
- safety 测试检查检测器返回 blocked；按已澄清的职责，CLI/SDK 返回原文不是失败，不要求这些测试验证最终用户服务的拦截策略。
- baseline 用例实际断言没有覆盖技术设计 §27.3 约定的十神与来源字段，也只检查前三步大运；其它单测提供了部分补充，不能等同于每个基线用例均完成全部断言。
- 没有对两个模式的 section schema、真实 adapter 协议响应、目录穿越与最低 Node 版本作验收。

## 6. 当前处理建议

1. R01、R05 的功能整改要求撤销；R02 保留为待核对差异，不判错、不修改内容。按用户当前用法，不因这三项修改业务代码。
2. 对结构化 sections、流年扩展、Skill 注册等尚未实现的原文档承诺，先判断是否仍需要交付；本报告不要求为对齐原文档一律补实现。用户确认裁剪的项目应同步上游范围，而不是继续作为必修代码项。
3. R03 的存储路径越界、R07 的缺时辰却生成具体时柱、R14 的 Node 引擎声明冲突等是可复现的独立问题，保留记录。是否立即处理按实际调用范围决定，不将领域内容争议或追问澄清当作这些问题已经消失的依据。
4. 优先同步已明确的职责与能力边界。若当前只验证个人 CLI 的完整输入、分析与同盘追问，可继续使用；对外宣称全部符合原始文档或分发 SDK 前，应核对保留的契约与独立问题。

本文是当前代码基线的审查快照。后续修复后应以验收证据更新状态，不能仅以“测试仍为绿色”关闭发现。
