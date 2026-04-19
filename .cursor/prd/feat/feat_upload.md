# feat: 文件上传、解析与首页数据展示

| 字段 | 值 |
|------|-----|
| **feat id** | `feat_upload` |
| **类型** | 核心功能（上传、解析、展示）+ 存储契约扩展 |
| **依赖** | 本地 SQLite 与文件仓已初始化；`records` 表与 `evidences` 表存在 |

**公用约定**：以 `.cursor/prd/agent-dev-guide-summary.md` 为准。仓库级 Agent 基线（Cursor 始终应用）：`.cursor/rules/ledgerly-always.mdc`。

## 平台描述

本需求为 Revenue Hub 的核心数据入口流程。用户通过上传财务凭证（iOS 图片、Live Photo、PDF）完成数据采集，系统自动解析并展示在首页仪表板。支持批量上传、逐项编辑确认、自动保存到本地存储，形成完整的本地优先工作流。

## 存储与契约影响（必填）

- **结构化 DB / 文件仓**：需改契约
  - 扩展 `evidences` 表：新增 `file_path`（本地重命名后路径）、`parse_status`（待解析/已解析/失败）、`extracted_data`（JSON 解析结果）
  - 文件仓：新增 `evidence_vault/` 目录规范，按项目规范重命名存储上传文件
  
- **须同步的工件**：
  - [x] `packages/storage/src/contracts.ts`（evidences 表字段扩展）
  - [x] `docs/contracts/local-storage.md`（文件仓规范与重命名规则）
  - [x] `packages/schemas/src/index.ts`（解析结果 DTO）
  - [x] 自动化测试（文件上传、解析、数据持久化）

- **说明**：扩展 `evidences` 表以支持文件路径追踪与解析状态管理；新增文件仓目录规范以支持本地文件存储与重命名；无数据迁移需求（纯扩展）。

## 需求描述

### 1. 文件上传与本地存储

- **支持格式**：iOS 原生图片资源（`.png`、`.jpg`、`.heic`）、Live Photo（`.heic` + `.mov`）、PDF 文件
- **上传方式**：支持单文件与文件夹批量上传
- **本地存储规范**：
  - 文件根据项目规范重命名，格式：`{entity_id}_{timestamp}_{original_filename_hash}.{ext}`
  - 存储路径：`evidence_vault/{entity_id}/uploads/{year}/{month}/`
  - 文件元数据（原始名称、大小、上传时间）保存至 `evidences` 表
  - 上传完成后自动触发解析（或用户手动触发）
  
- **不包含**：云端备份、文件加密、跨设备同步

### 2. 文件解析与数据提取

- **解析流程**：
  - 支持多文件并行解析
  - 解析结果展示为可编辑列表，每项包含：原始文件、提取的结构化数据、编辑状态、操作按钮
  
- **解析结果字段**（根据凭证类型）：
  - 必填：`date`、`amount`、`description`
  - 可选：`source`、`target`、`category`、`tax_category`、`notes`
  
- **编辑与提交逻辑**：
  - 每项可编辑提取的字段
  - 提交时验证必填字段（date、amount、description）
  - 提交后：若为最后一项，返回 Ledger；否则移除当前项，显示下一项
  - 所有数据按 `records` 表规范保存至本地 SQLite
  
- **不包含**：OCR 模型训练、云端解析服务、手写识别

### 3. 首页数据展示

- **数据来源**：从本地 SQLite `records` 表读取已解析的数据
- **展示组件**：
  - 顶部金额卡片：本月总收入、支出、净额（基于 `occurred_on` 与 `amount_cents`）
  - 柱状图：按日期聚合的收入趋势（过去 30 天）
  - 明细列表：最近 20 条记录，支持下拉刷新、上拉加载更多
  
- **UI 约束**：
  - 不修改现有 UI 样式
  - 仅允许新增刷新、加载更多等交互效果
  - 保持 UI 一致性
  
- **不包含**：自定义日期范围、高级筛选、数据导出

## 主要代码锚点（Dev 优先改这里）

- `apps/mobile/src/features/upload/` — 上传与解析 UI 与逻辑
- `packages/storage/src/contracts.ts` — evidences 表与文件仓契约
- `docs/contracts/local-storage.md` — 文件仓规范文档
- `apps/mobile/src/features/home/` — 首页数据展示与聚合逻辑

## 验收标准（可勾选、可举证）

- [ ] **文件上传**：支持单文件与文件夹批量上传，文件按规范重命名并保存至本地；元数据正确保存至 `evidences` 表
- [ ] **文件解析**：自动或手动触发解析，结果展示为可编辑列表；解析状态（待解析/已解析/失败）正确追踪
- [ ] **数据提交**：编辑后提交，数据保存至 `records` 表，流程正确（最后一项返回 Ledger，其他项移除）；必填字段验证生效
- [ ] **首页展示**：金额卡片、柱状图、明细列表正确展示本地数据；下拉刷新、上拉加载更多功能可用
- [ ] **存储契约**：`evidences` 表新增字段、文件仓规范、解析结果 DTO 已同步至契约文档与测试
- [ ] **自动化测试**：文件上传、解析、数据持久化流程覆盖率 ≥ 80%；`pnpm test` 通过
- [ ] **门禁**：`pnpm lint`、`pnpm typecheck`、`pnpm build`、`pnpm contract:check`、`pnpm smoke` 全部通过
- [ ] **冒烟测试**：手工验证 iOS 设备上传、解析、首页展示完整流程；见 `tests/smoke/README.md`

## 参考 Skill

- `.cursor/skills/project/expo`（Expo 文件系统 API、本地存储）
- 可选：图片解析库（如 `react-native-vision-camera`、`tesseract.js` 等），可通过 npm 自动下载

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

## 公用约定（勿在本文件重复展开）

> 角色三角、工作流与交付前 `pnpm` 命令见 `.cursor/prd/agent-dev-guide-summary.md`；需求闭环后按该摘要在 `.cursor/context/` **新建** `{semver}_context.md` 并按需同步 `main.md`。

### 本 feat 补充交付说明

- **文件解析工具**：可通过 npm 自动下载，无需权限审批
- **参考数据设计**：`prd/database-schema-summary/v1.md`（当前活跃契约）
- **手工冒烟清单**：`tests/smoke/README.md`
- **Testor 走查**：具体 UI 场景表与测试报告由 Testor 按 `.cursor/rules/work_flow.md` 产出；Harness 对验收项勾选须有证据（截图/报告/CI）
