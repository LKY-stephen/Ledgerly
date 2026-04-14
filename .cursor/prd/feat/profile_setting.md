# 设置页 Profile 信息规范化与 Vercel Base URL 清理

**公用约定**：以 `.cursor/prd/agent-dev-guide-summary.md` 为准（流程、契约真源、`pnpm` 门禁、完结后上下文维护）；结构参考 `.cursor/prd/TEMPLATE.md`。Cursor 始终应用：`.cursor/rules/creator-cfo-always.mdc`。

## 平台描述

- 当前阶段为 Expo + React Native + Expo Router 的移动端本地优先产品。
- 本需求仅涉及设置页、设备态偏好存储、以及票据 mapping / planner 的 source 上下文传递；**不引入后端**。

## 背景与目标

- 设置页当前仍暴露 `Vercel API Base URL` 配置，但现阶段解析请求已经改为前端直连 OpenAI，base URL 应来自运行时环境变量，不应继续由用户在设置页维护。
- 业务侧需要一个稳定、明确、可持久化的 `Profile` 信息区块，供后续 mapping / planner 在解析票据时作为 `source profile info` 上下文输入，减少 source 字段误判，并确保解析上下文始终对应当前使用者。
- 本 PRD 的目标是把“Profile 信息”从口头需求变成可执行的产品与实现约束，减少 agent 在实现时对字段用途、优先级和范围的猜测。

## 存储与契约影响

- **结构化 DB / 文件仓**：`无新增 SQLite 表 / 无新增文件仓集合`；本需求应复用现有设备态契约中的 `profile_name`、`profile_email`、`profile_phone`，不得新增平行字段。
- **须同步的工件**（实现时按实际勾选）：
  - [ ] `packages/storage/src/contracts.ts`
  - [ ] `docs/contracts/`
  - [ ] `packages/schemas`
  - [ ] 自动化测试
- **说明**：
  - 若实现代码仍保留本地 `parseApiBaseUrl` / `Vercel API Base URL` 持久化逻辑，应清理陈旧状态、文案、读写逻辑与测试。
  - 若 `packages/storage/src/contracts.ts` 与 `docs/contracts/` 已表达目标状态，则无需人为扩展契约；但实现必须与契约一致。
  - `OpenAI API Key` 是否保留，取决于当前前端直连解析链路是否仍需要用户本地提供 key；本需求**只删除 base URL 配置**，不默认删除 API key。

## 需求范围

### 1. 设置页新增或明确 Profile 模块

- 设置页需要提供独立的 `Profile` 信息模块。
- 模块至少包含以下字段：
  - `name`
  - `email`
  - `phone`
- 三个字段均为本地设备态信息，用于后续 mapping / planner 上下文，不是远端账户资料。
- 字段应支持读取、编辑、保存与再次打开后的回显。

### 2. 删除设置页中的 Vercel Base URL 信息

- 设置页中不再展示 `Vercel API Base URL`、`Vercel Parse API`、`vercel base url` 或等价表述。
- 不再允许用户在设置页编辑或保存解析服务 base URL。
- 解析相关 base URL 仅允许来自运行时环境变量，例如 `EXPO_PUBLIC_OPENAI_BASE_URL`。
- 若当前实现中仍存在本地状态、provider 字段、AsyncStorage 读写或默认值逻辑，也应一并移除，避免 UI 删除但代码路径仍残留旧行为。

### 3. Profile 信息接入 mapping / planner 的 source 上下文

- 后续票据解析、mapping、planner 提示词或请求载荷中，`source profile info` 必须明确来自设置页的 `Profile` 信息。
- agent / runtime 不得把 `source` 理解为任意旧缓存、示例值、历史用户资料或硬编码字符串。
- 推荐的语义是：
  - `name`：当前操作者/当前主体的首选显示名称
  - `email`：当前主体的补充识别信息
  - `phone`：当前主体的补充识别信息
- 当 `Profile` 信息为空时：
  - mapping / planner 仍可继续执行；
  - 但不得伪造当前主体信息；
  - 如流程已有 warning 机制，可标记 source 上下文不足，而不是静默猜测。

## 非目标

- 不新增后端 profile 表、远程用户中心或跨设备同步。
- 不改动登录体系本身，不把 Apple 登录资料自动覆盖到 Profile 模块，除非后续 PRD 明确要求。
- 不借本需求引入新的解析服务路由、代理层或服务端配置页。
- 不把 `Profile` 字段直接写入账务主表；本需求的核心是“设置与解析上下文”，不是会计记录建模变更。

## 实现约束

- 必须遵守 mobile-first、local-first；不得为了保存 Profile 信息引入后端依赖。
- 必须遵守 schema-first；若发现实现代码与契约不一致，应先对齐契约真源，再接功能。
- app 层不得跨 app 直接 import；如需共享类型或契约，走 `packages/*`。
- 若 `Profile` 信息进入 mapping / planner 请求，字段名、注释与提示词文案要统一，避免出现 `profile`、`sourceProfile`、`userProfile` 多套近义命名造成理解偏差。

## 验收标准

- [ ] 设置页存在清晰的 `Profile` 模块，并包含 `name`、`email`、`phone` 三个字段。
- [ ] 用户修改 `Profile` 信息后，可本地持久化并在重新进入页面后正确回显。
- [ ] 设置页中不再出现 `Vercel API Base URL` 或等价配置项与说明文案。
- [ ] 运行时解析 base URL 不再依赖本地设置项，而是仅来自环境变量或既有固定运行时配置。
- [ ] mapping / planner 使用的 `source profile info` 明确取自当前 `Profile` 信息，而不是旧缓存或隐式默认值。
- [ ] 当 `Profile` 信息为空时，流程不会伪造 source 主体信息；如有 warning 机制，可暴露“上下文不足”。
- [ ] 至少新增或更新一处自动化测试，覆盖 `Profile` 持久化、base URL 清理，或 source profile info 传递中的至少一项关键行为。
- [ ] 更新一条 smoke path，覆盖“设置页编辑 Profile -> 进入解析/映射流程”的最短关键路径。

## 建议测试点

- `Profile` 三字段的加载、保存、回显测试。
- 删除 `parseApiBaseUrl` 后的 provider / storage 回归测试。
- remote parse / mapping 请求优先读取环境变量 base URL 的测试。
- planner / mapping prompt 或 payload 中包含 `source profile info` 的测试。

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

- 若实现过程中发现仓库内已有部分 `Profile` 契约已落地、但 UI / provider / prompt 仍未完全对齐，应以“统一语义、清理残留、补齐测试”为主，而不是重复新增第二套状态。
- 本需求的完成标准不是“页面上有输入框”，而是“设置页状态、设备态契约、以及 mapping / planner 上下文三者一致”。
