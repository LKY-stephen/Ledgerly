# feat: 新增 Infer API 渠道，并通过 OpenAI 兼容接口接入解析链路

**公用约定**：以 `.cursor/prd/agent-dev-guide-summary.md` 为准。仓库级 Agent 基线（Cursor 始终应用）：`.cursor/rules/ledgerly-always.mdc`。

## 平台描述

- 当前阶段为 **Expo + React Native + Expo Router** 的移动端本地优先产品。
- 现有解析链路已支持通过设置页保存本地 AI 配置，并在 parse / planner / mapping 中调用远端模型能力。
- 本需求目标是在**不引入后端**的前提下，新增 **Infer API** 渠道，让用户可以填写 `baseUrl` 与 `apiKey`，并通过 **OpenAI 兼容接口** 接入既有解析链路。

## 背景与目标

- 当前用户可能已经在 Infer 平台购买了 token，但现有产品没有正式入口承接这一类 OpenAI-compatible provider。
- 这类需求如果只写成“新增 infer 设置项”，实现时很容易遗漏：
  - Infer 是不是独立 provider，还是临时覆盖 OpenAI
  - `baseUrl` 与 `apiKey` 如何本地持久化
  - parse 与 planner / mapping 是否必须走同一 Infer 配置
  - 出错时是报 `baseUrl` 缺失、`apiKey` 缺失，还是兼容接口调用失败
- 本 PRD 的目标是让 agent 明确：本次是**新增一个 OpenAI-compatible 的 Infer 渠道**，而不是重写业务链路，也不是引入后端代理。

## 存储与契约影响（必填）

- **结构化 DB / 文件仓**：`无新增 SQLite 表 / 无新增文件仓集合`；但**设备态契约需要扩展**，用于持久化 Infer provider、Infer base URL 与 Infer API key。
- **须同步的工件**：
  - [ ] `packages/storage/src/contracts.ts`
  - [ ] `docs/contracts/`
  - [ ] `packages/schemas`
  - [x] 自动化测试（至少 1 条设置页保存或 provider 切换链路测试）
  - [x] `tests/smoke/README.md`
- **说明**：
  - 若当前已存在 `ai_provider` 设备态字段，本需求应在现有语义上扩展 `infer`，而不是再新增平行 provider 字段。
  - 需要新增或明确的本地状态通常包括：
    - `ai_provider`：扩展支持 `infer`
    - `infer_base_url`
    - `infer_api_key`
  - 若当前仓库已存在相近字段，应优先复用并统一命名，避免出现 `inferUrl`、`inferBaseUrl`、`proxyBaseUrl` 多套近义字段。

## 需求描述

### 1. 设置页新增 Infer 渠道入口

- 设置页 `AI` 区块需要支持 `Infer API` 作为新的 provider 选项。
- Infer 在产品语义上应被视为一个独立 provider，而不是“覆盖 OpenAI 配置”的临时模式。
- 当前阶段推荐 provider 选择语义为：
  - `OpenAI`
  - `Google AI Studio Gemini`
  - `Infer API`
- 若当前仓库尚未完全对齐多 provider UI，也至少要保证 Infer 配置项在设置页中有清晰入口，不与 OpenAI/Gemini 设置混淆。

### 2. Infer 配置项

- 选中 `Infer API` 时，设置页至少需要允许用户填写：
  - `Infer Base URL`
  - `Infer API Key`
- 推荐文案方向：
  - 区块标题：`Infer API`
  - 说明文案：Infer 配置仅保存在本机，并通过 OpenAI 兼容接口接入解析请求
- 本需求**不要求**在设置页暴露更多高级参数，除非当前实现已强依赖：
  - 不默认新增 temperature
  - 不默认新增 organization
  - 不默认新增自定义 headers 编辑器

### 3. 保存规则

- 用户点击保存时，必须校验 Infer 配置完整性。
- 最低校验要求：
  - 选中 `Infer API` 时，`Infer Base URL` 必填
  - 选中 `Infer API` 时，`Infer API Key` 必填
- 若缺失，必须阻止保存，并给出清晰错误提示。推荐文案：
  - `请填入 Infer Base URL`
  - `请填入 Infer API Key`
- 持久化规则：
  - 保存 Infer 时写入当前 provider 为 `infer`
  - Infer 的 `baseUrl` 与 `apiKey` 写入本地设备态
  - 不自动清空其他 provider 已保存的 key

### 4. 运行时链路接入方式

- Infer 渠道在运行时通过 **OpenAI 兼容接口** 接入。
- 也就是说：parse 与 planner / mapping 仍沿用现有 OpenAI 风格的请求/响应语义，但请求目标地址与鉴权信息改为 Infer 配置。
- 约束：
  - 同一次上传处理链路中的 parse 与 planner / mapping 必须使用**同一个 Infer 配置**
  - 不允许 parse 用 Infer、planner 用其他 provider 混搭，除非未来 PRD 明确要求
  - 除 provider 路由变化外，其余业务流程、字段映射、落库行为保持不变

### 5. 与现有 OpenAI/Gemini 配置的关系

- Infer 是新增 provider，不应破坏现有 OpenAI / Gemini 行为。
- 非目标行为：
  - 不把 Infer base URL 塞进 OpenAI base URL 字段里冒充 OpenAI
  - 不要求用户每次切换 provider 都重新输入之前保存过的 key
  - 不因为切到 Infer 而删除 OpenAI/Gemini 历史配置

### 6. 错误处理要求

- 当 Infer 配置缺失或 Infer 兼容接口调用失败时，错误必须可定位。
- 至少应区分：
  - 缺 `Infer Base URL`
  - 缺 `Infer API Key`
  - Infer 接口网络错误
  - Infer 返回非 OpenAI-compatible 响应或格式异常
- 不允许出现：
  - 明明是 Infer 配置问题，却统一报成 `Missing OpenAI API key`
  - Infer 调用失败后静默回退到 OpenAI

## 范围边界

**包含**：

- 设置页新增 Infer provider 与配置输入项
- Infer 配置的本地持久化
- parse 与 planner / mapping 根据当前 provider 路由到 Infer
- Infer 配置缺失与兼容接口失败时的清晰错误
- 自动化测试与 smoke 路径更新

**不包含**：

- 引入后端代理、中转层或新的服务端配置中心
- 重构现有解析主流程
- 暴露高级 OpenAI-compatible 参数编辑能力
- 重构账务 schema、本地文件仓结构或非本需求相关 UI
- 自动 fallback 到其他 provider

## 实现约束

- 必须遵守 **mobile-first / local-first**；Infer 的 `baseUrl` 与 `apiKey` 都是设备态，不引入远端账户配置中心。
- 必须遵守 **schema-first**；凡涉及设备态契约更新，必须同步 `packages/storage/src/contracts.ts` 与 `docs/contracts/`。
- Infer 渠道虽然走 OpenAI 兼容接口，但在产品语义上必须被视为独立 provider，不要与 OpenAI 配置混写。
- parse 与 planner / mapping 是同一条需求链路，本次 Infer 接入必须保证两段一致切换，不能只改 parse。
- 若现有命名已存在 `aiProvider`、`openaiApiKey`、`geminiApiKey` 等模式，应优先沿用一致命名风格，例如 `inferBaseUrl`、`inferApiKey`。

## 验收标准

- [ ] 设置页 `AI` 区块支持 `Infer API` 作为新的 provider 或清晰配置入口。
- [ ] 选中 `Infer API` 时，可填写并保存 `Infer Base URL` 与 `Infer API Key`。
- [ ] 未填写 `Infer Base URL` 时，保存会被阻止并提示 `请填入 Infer Base URL`。
- [ ] 未填写 `Infer API Key` 时，保存会被阻止并提示 `请填入 Infer API Key`。
- [ ] 保存后重新进入设置页，Infer 配置可正确回显。
- [ ] 上传解析链路中的 parse 与 planner / mapping 会读取当前 Infer 配置，并通过 OpenAI-compatible 方式调用 Infer。
- [ ] Infer 调用失败时，会返回 Infer 定向错误，不会静默回退到 OpenAI。
- [ ] 不会因为接入 Infer 而破坏既有 OpenAI / Gemini 配置与主链路。
- [ ] 至少新增或更新 1 条自动化测试，覆盖 Infer 配置保存或运行时路由中的关键行为。
- [ ] 更新 `tests/smoke/README.md`，补充“设置 Infer -> 保存配置 -> 上传解析”的真实点击验收路径。

## 建议测试点

- 设置页中 Infer provider 切换、`baseUrl` 输入、`apiKey` 输入、保存、重新进入回显。
- 缺 `Infer Base URL` / 缺 `Infer API Key` 时的阻止保存与错误提示。
- Infer provider 下 parse 与 planner / mapping 是否都走同一配置。
- Infer 返回异常响应时，是否给出定向错误，而不是误报 OpenAI 错误。
- OpenAI / Gemini 已有主路径是否没有被 Infer 接入改坏。

## Testor 验收补充

- 本需求属于**移动端交互 + 远端链路切换**需求，Testor 必须在真实设备或模拟器中逐项点击验收，不能只跑单测。
- 最短手工验收路径至少包括：
  1. 进入设置页
  2. 切换到 `Infer API`
  3. 不填 `baseUrl` 或 `apiKey` 点击保存，验证错误提示
  4. 填入 `Infer Base URL` 与 `Infer API Key` 并保存
  5. 进入上传解析主路径，确认请求走 Infer
  6. 回归一次 OpenAI 或 Gemini，确认原有 provider 未被改坏
- 若 Testor 需要真实票据样本、图片、PDF 或其他测试材料以验证 Infer 链路，可向用户索要**文件路径**，并在测试报告中记录材料来源与覆盖范围。

## 参考 Skill

- `.cursor/skills/project`
- `.cursor/skills/project/expo`

## 外部参考（非真源）

以下项目仅用于产品交互、业务流程、计算口径与异常处理的启发式参考，不作为本仓库契约、数据结构或实现真源：

- `GnuCash`：<https://github.com/gnucash/gnucash>
  - 重点参考：复式记账、金额汇总、余额计算、会计口径一致性
- `Akaunting`：<https://github.com/akaunting/akaunting>
  - 重点参考：中小企业记账产品的信息架构、表单流程、报表与业务模块组织

使用边界：
- 不直接迁移其数据库结构、包结构、后端实现
- 本仓库仍以 `docs/contracts/`、`packages/storage/src/contracts.ts`、`packages/schemas/src/index.ts` 为真源
- 若外部参考与当前 PRD 冲突，以当前 PRD 与本仓库契约为准

## 本 feat 补充交付说明

- 本需求的完成标准不是“设置页多了两个输入框”，而是“Infer 配置、运行时路由、错误提示与测试证据”四者一致。
- 若实现过程中发现当前 provider 体系尚未统一，应优先统一 provider 语义与命名，再接入 Infer，而不是新增一套临时并行状态。
