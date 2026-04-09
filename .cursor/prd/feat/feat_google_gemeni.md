# feat: 新增 Google AI Studio Gemini 渠道，并支持设置页切换 AI Provider

**公用约定**：以 `.cursor/prd/agent-dev-guide-summary.md` 为准。仓库级 Agent 基线（Cursor 始终应用）：`.cursor/rules/creator-cfo-always.mdc`。

## 平台描述

- 当前阶段为 **Expo + React Native + Expo Router** 的移动端本地优先产品。
- 解析链路目前以前端直连 OpenAI 为主，用户在设置页本地保存 `OpenAI API key` 后，上传解析与后续 mapping / planner 逻辑会调用 OpenAI。
- 本需求目标是在**不引入后端**的前提下，新增 **Google AI Studio Gemini** 作为第二条 AI 渠道，并允许用户在设置页自主选择当前生效的 provider。

## 背景与目标

- 当前产品仅支持 OpenAI，一旦用户希望切换到 Gemini，就没有正式入口，也没有明确的持久化与运行时切换规则。
- 这类需求如果只写成“加一个选项”，实现时很容易遗漏：
  - 当前 provider 如何持久化
  - 切回 OpenAI 时旧 key 是否丢失
  - parse 与 planner / mapping 是否必须使用同一 provider
  - 错误提示、默认值、旧数据兼容如何定义
- 本 PRD 的目标是把“新增 Gemini 渠道”收紧为**可实现、可测试、可验收**的产品与工程约束，避免 agent 只改 UI 不改真实链路，或者改了链路但未对齐本地设备态契约。

## 存储与契约影响（必填）

- **结构化 DB / 文件仓**：`无新增 SQLite 表 / 无新增文件仓集合`；但**设备态契约需要扩展**，用于持久化当前 AI provider 与 Gemini API key。
- **须同步的工件**：
  - [x] `packages/storage/src/contracts.ts`
  - [x] `docs/contracts/`
  - [ ] `packages/schemas`
  - [x] 自动化测试（至少 1 条设置页持久化或 provider 切换链路测试）
  - [x] 冒烟路径更新（`tests/smoke/README.md` 增加 provider 切换与真实点击验收路径）
- **说明**：
  - 默认应新增设备态字段以表达：
    - `ai_provider`：当前生效渠道，至少支持 `openai` / `gemini`
    - `gemini_api_key`：用户本地保存的 Gemini API key
  - 现有 `openai_api_key` 应继续保留，以保证老用户兼容与双渠道来回切换时不丢历史输入。
  - 若解析结果、planner 结果或历史落库元数据需要区分“来自 OpenAI 还是 Gemini”，必须同步评估 `packages/schemas` 与对应 parser / sourceLabel 语义；**不得继续把 Gemini 结果静默记成 `openai_gpt`**。

## 需求描述

### 1. 设置页新增 AI Provider 选择

- 设置页 `AI` 区块需要从“单一 OpenAI API Key”升级为“provider + 对应 API key”的组合配置。
- provider 选择方式为**单选**，当前阶段仅包含两个选项：
  - `OpenAI`
  - `Google AI Studio Gemini`
- 默认规则：
  - 老用户升级后，若已有 `openai_api_key` 且没有 provider 记录，则默认 provider 为 `OpenAI`
  - 新安装或本地状态为空时，也默认 provider 为 `OpenAI`
- 当前阶段**不支持多选、并行调用或自动 fallback**；同一时刻只能有一个当前 provider。

### 2. 设置页保存规则

- 用户点击 `Save` 时，必须校验**当前选中的 provider 对应的 API key** 是否已填写。
- 校验规则：
  - 选中 `OpenAI` 时，`OpenAI API Key` 为必填
  - 选中 `Gemini` 时，`Gemini API Key` 为必填
- 如果当前 provider 的 key 为空，必须阻止保存，并给出可读提示。推荐文案：
  - `请填入 OpenAI API Key`
  - `请填入 Gemini API Key`
- 持久化规则：
  - 保存时同时写入 `ai_provider`
  - 当前 provider 对应的 key 写入其各自设备态字段
  - 未选中的另一方 key **不自动清空**
- 非目标行为：
  - 不要求用户每次切换 provider 都重新输入之前已保存过的 key
  - 不因为切换 provider 而覆盖或删除另一方 provider 的 key

### 3. 运行时链路切换规则

- 后续**解析（parse）**与**planner / mapping** 的远端 AI 调用，都必须读取当前保存的 `ai_provider`，并路由到对应 provider。
- 约束：
  - 同一次上传处理链路中的 parse 与 planner / mapping 必须使用**同一个 provider**
  - 不允许出现 parse 用 OpenAI、planner 用 Gemini 的混搭，除非未来 PRD 明确要求
  - 除 provider 切换外，其余业务流程、UI 主路径、落库流程、映射逻辑保持不变
- 用户视角上的变化应只体现在：
  - 设置页可切换 provider
  - 缺少对应 key 时会得到清晰提示
  - 解析链路实际请求改为对应 provider

### 4. 运行时配置来源

- `baseUrl`、`model` 等 provider 运行时配置**不由设置页维护**，继续走运行时环境变量或既有固定配置。
- OpenAI 继续沿用现有环境变量约定：
  - `EXPO_PUBLIC_OPENAI_BASE_URL`
  - `EXPO_PUBLIC_OPENAI_MODEL`
- Gemini 建议新增对应运行时环境变量，例如：
  - `EXPO_PUBLIC_GEMINI_BASE_URL`
  - `EXPO_PUBLIC_GEMINI_MODEL`
- 本需求**不新增**设置页里的 `baseUrl` / `model` 输入框；用户只负责 provider 与 API key。

### 5. 文案与显示要求

- 设置页不再仅显示 “OpenAI API Key”，而应明确体现当前是**AI provider 配置**。
- 当用户切换 provider 时：
  - 输入框 label、placeholder、说明文案应同步切换
  - 如果已保存过对应 key，应正确回显该 provider 的本地值
- 推荐文案方向：
  - 区块标题：`AI Provider`
  - 区块说明：当前 provider 与对应 API key 仅保存在本机，用于解析请求头，不写入 SQLite 主业务表

### 6. 错误处理与兼容

- 如果当前 provider 缺少 key，运行时解析链路必须返回**provider 对应的缺失错误**，而不是一律写成 “Missing OpenAI API key”。
- 老用户兼容要求：
  - 已存在的 `openai_api_key` 不应在升级后丢失
  - 未设置 `ai_provider` 的旧状态在首次加载时应安全落到 `OpenAI`
- 若 Gemini provider 尚未配置运行时 `baseUrl` / `model`，错误应明确为配置缺失，而不是假装请求成功或默默回退到 OpenAI。

## 范围边界

**包含**：

- 设置页新增 provider 单选与对应 API key 输入 / 保存
- 设备态持久化新增 `ai_provider`、`gemini_api_key`
- parse 与 planner / mapping 远端调用根据 provider 切换
- provider 缺 key / 缺配置时的清晰报错
- 自动化测试与 smoke 路径更新

**不包含**：

- 引入后端代理、中转层或新的服务端设置中心
- 同时调用多个 provider、A/B provider、自动 fallback
- 在设置页暴露 `baseUrl`、`model`、高级参数编辑能力
- 重构账务 schema、本地文件仓结构或非本需求相关 UI
- 新增“自动从 OpenAI key 推导 Gemini key”之类的迁移逻辑

## 实现约束

- 必须遵守 **mobile-first / local-first**；provider 选择与 API key 都是设备态，不引入远端账户配置。
- 必须遵守 **schema-first**；凡涉及设备态契约更新，必须同步 `packages/storage/src/contracts.ts` 与 `docs/contracts/`。
- 若链路落库中的 `parser`、`sourceLabel`、`model` 语义需要体现 provider，必须显式更新契约、schemas 与测试；**不得用旧的 OpenAI 枚举或文案偷渡 Gemini 结果**。
- parse 与 planner / mapping 是同一条需求链路，本次 provider 切换必须保证两段都一致切换，不能只改第一段。
- 任何新增错误文案都应尽量可定位，例如：
  - 缺 Gemini key
  - 缺 Gemini base URL / model
  - Gemini 返回非 JSON 或格式不符

## 验收标准

- [ ] 设置页 `AI` 区块支持 `OpenAI` / `Google AI Studio Gemini` 两个 provider 的单选切换。
- [ ] 默认 provider 为 `OpenAI`，并兼容老用户已有 `openai_api_key` 的本地状态。
- [ ] 选中 `OpenAI` 保存时，未填写 OpenAI key 会阻止保存并提示 `请填入 OpenAI API Key`。
- [ ] 选中 `Gemini` 保存时，未填写 Gemini key 会阻止保存并提示 `请填入 Gemini API Key`。
- [ ] 保存 provider 时只更新当前 provider 与对应 key，不会清空另一方已保存 key。
- [ ] 重新进入设置页后，当前 provider 与对应 key 能正确回显。
- [ ] 上传解析链路中的 parse 与 planner / mapping 都会读取当前 provider，并调用对应 provider 的远端接口。
- [ ] Gemini 未配置 key 或运行时配置时，会给出 Gemini 相关错误，不会静默回退为 OpenAI。
- [ ] 如本次实现需要区分 provider 来源，解析结果中的 `parser` / `sourceLabel` / `model` 语义与契约保持一致，不再把 Gemini 结果标记为 OpenAI。
- [ ] 至少新增或更新 1 条自动化测试，覆盖设置页保存 / provider 切换 / 运行时路由中的关键行为。
- [ ] 更新 `tests/smoke/README.md`，补充“设置 provider -> 保存 key -> 上传解析”的真实点击验收路径。

## 建议测试点

- 设置页中 provider 单选切换、key 输入、保存、重新进入回显。
- 老状态兼容：仅有 `openai_api_key` 时默认 provider 是否正确。
- 切换到 Gemini 后，parse 与 planner / mapping 是否都使用 Gemini 配置。
- 缺少当前 provider key 时，是否给出 provider 定向错误。
- 若链路记录 provider 元数据，验证落库字段或展示文案不再错误写成 OpenAI。

## Testor 验收补充

- 本需求属于**移动端交互 + 远端链路切换**需求，Testor 必须在真实设备或模拟器中逐项点击验收，不能只跑单测。
- 最短手工验收路径至少包括：
  1. 进入设置页
  2. 切换到 `Gemini`
  3. 不填 key 点击保存，验证 toast / 错误提示
  4. 填入 Gemini key 并保存
  5. 进入上传解析主路径，确认请求走 Gemini provider
  6. 再切回 `OpenAI`，确认历史 OpenAI key 仍可回显或继续使用
- 若 Testor 需要真实票据样本、图片、PDF 或其他测试材料以验证 provider 切换后的解析结果，可向用户索要**文件路径**，并在测试报告中记录材料来源与覆盖范围。

## 参考 Skill

- `.cursor/skills/project`
- `.cursor/skills/project/expo`

## 本 feat 补充交付说明

- 本需求的完成标准不是“设置页多了一个单选项”，而是“设置页设备态、运行时 provider 路由、错误提示、以及测试证据”四者一致。
- 若实现过程中发现当前 `remote-parse` / `ledger-runtime` / 设置页 provider 状态命名不统一，应优先统一语义，例如固定使用 `aiProvider` / `openaiApiKey` / `geminiApiKey`，避免出现 `channel`、`provider`、`vendor` 混用。
