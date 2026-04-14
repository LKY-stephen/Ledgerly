# feat: 修复上传与解析链路（Vercel Parse API）

**公用约定**：以 `.cursor/prd/agent-dev-guide-summary.md` 为准。仓库级 Agent 基线（Cursor 始终应用）：`.cursor/rules/creator-cfo-always.mdc`。

## 平台描述

当前移动端上传后解析链路存在中断/不稳定问题。本需求聚焦**修复既有链路**：
1) 文件按本地规则落盘；
2) 调用已部署的 Vercel 解析 API；
3) 将解析结果按现有本地 schema 落库；
4) 提供可校对的票据详情展示页（测试样式）。

> 说明：本阶段仍为 mobile-first / local-first。此处仅调用既有外部解析端点，不引入本仓库独立后端模块。

## 配置与环境

- Parse API Base URL（示例）：`https://creator-cfo-monorepo-xxx.vercel.app`
- API Key：**不得写入 PRD 或代码仓库明文**，统一通过环境变量注入。

建议环境变量命名：
- `EXPO_PUBLIC_PARSE_API_BASE_URL`
- `OPENAI_API_KEY`（仅服务端使用，不下发客户端）
- 若移动端直连中转接口，使用：`EXPO_PUBLIC_PARSE_API_KEY`（仅在确认无泄露风险时）

## 存储与契约影响（必填）

- **结构化 DB / 文件仓**：仅读现有契约；如实现中发现字段不足，按 schema-first 提出最小契约变更。
- **须同步的工件**：
  - [ ] `packages/storage/src/contracts.ts`（仅当字段/状态机变更时）
  - [ ] `docs/contracts/`（仅当契约变更时）
  - [ ] `packages/schemas`（仅当解析 DTO 变更时）
  - [x] 自动化测试（上传→解析→落库→展示最少 1 条主路径测试）
  - [x] 冒烟路径更新（`tests/smoke/README.md` 增加本链路校对步骤）
- **说明**：默认目标是“修复实现”而非“改契约”；若必须改契约，必须同 PR 同步文档与测试。

## 需求描述

### 1) 上传与本地落盘（修复）

- 上传文件后，先按既有 PRD/契约规则保存至本地文件仓。
- 必须记录可追踪的本地路径与关联实体 ID。
- 明确失败态：保存失败时不给 API 发请求，并向 UI 返回可读错误。

### 2) 调用解析 API（修复）

- 使用配置化 `baseUrl` 发起请求，不允许硬编码线上地址。
- 请求超时、4xx/5xx、网络异常都应返回可区分错误类型（用于 UI 提示与日志）。
- 解析成功后返回结构化结果（票据字段集合），进入落库流程。

### 3) 解析结果落库（修复）

- 将解析数据映射到当前本地数据库已定义 schema。
- 字段映射遵循现有 contract/schema，不新增隐式字段。
- 落库失败需保留原始解析结果（可重试），并标记状态。

### 4) 校对展示页（新增测试样式）

- 新增/完善一个“票据完整数据校对”展示视图（测试样式即可，不要求最终视觉稿）。
- 展示目标：可完整查看本次解析后的关键字段，便于人工核对。
- 至少包含：票据来源文件、金额、日期、商户/对手方、分类、备注（按实际 schema 字段展示）。

## 范围边界

**包含**：上传、落盘、调用解析 API、结果映射落库、校对展示。

**不包含**：
- 新 OCR/模型能力开发
- 新后端服务建设
- 大规模 UI 重构
- 与本需求无关的 schema 重设计

## 验收标准

- [ ] 主路径可用：选择文件 → 本地保存成功 → API 解析成功 → 本地落库成功 → 校对页可见完整数据
- [ ] 失败路径可用：本地保存失败 / API 失败 / 落库失败均有明确提示，且不会造成脏数据
- [ ] 配置合规：无明文 API Key；`baseUrl` 可通过环境切换
- [ ] 数据正确：落库字段与现有 schema 一致，关键字段值可在校对页核对
- [ ] 自动化测试：新增至少 1 个覆盖主链路的测试
- [ ] 冒烟文档：`tests/smoke/README.md` 新增该链路手工校对步骤

## 实现建议（给 Agent 的最小执行指引）

1. 先定位上传入口与解析调用入口（复用既有模块，不新建平行实现）。
2. 先打通主路径，再补失败分支。
3. 映射落库时以 `packages/storage/src/contracts.ts` 与 `packages/schemas/src/index.ts` 为唯一字段真源。
4. 最后补测试与 smoke 文档，确保变更闭环。

## 参考

- PRD 模板：`.cursor/prd/TEMPLATE.md`
- 参考目录：`/Users/peanut-tomo/Desktop/Tomo-project/creator_cfo_monorepo/prd`
- 契约真源：
  - `docs/contracts/`
  - `packages/storage/src/contracts.ts`
  - `packages/schemas/src/index.ts`

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
