# feat: 上传解析链路修复与单一 Parser/Planner 工作流收口

| 字段 | 值 |
|------|-----|
| **feat id** | `feat_upload_planner` |
| **类型** | 上传解析工作流修复 + 严格 DTO 收口 + 存储契约扩展 |
| **依赖** | `feat_upload` 已完成；本地 SQLite 与文件仓已可用 |

**公用约定**：以 `.cursor/prd/agent-dev-guide-summary.md` 为准。仓库级 Agent 基线（Cursor 始终应用）：`.cursor/rules/creator-cfo-always.mdc`。

## 平台描述

本需求将现有 upload/parse 流程收口为唯一 parser/planner 工作流，支持 PDF 与图片走同一条本地优先审批式链路，并废止旧的主动 `scheme mapping` 心智。

## 存储与契约影响（必填）

- **结构化 DB / 文件仓**：需改契约
  - 新增工作流表：`upload_batches`、`extraction_runs`、`planner_runs`、`planner_read_tasks`、`workflow_write_proposals`、`candidate_records`、`workflow_audit_events`
  - `evidences.extracted_data` 继续保留为当前 review 快照；历史 parse/planner JSON 改由 workflow 表持久化
  - `planner_runs.planner_payload_json` 保存远端有效 planner DTO
  - `evidences.parse_status` 保留为兼容摘要字段，真实流程状态由 `upload_batches.state` 与 `candidate_records.state` 表达

- **须同步的工件**：
  - [x] `packages/storage/src/contracts.ts`
  - [x] `docs/contracts/local-storage.md`
  - [x] `packages/schemas/src/index.ts`
  - [x] 自动化测试

## 需求描述

### 1. PDF / 图片统一解析

- PDF 与图片上传后统一进入 `upload_batch`
- exact duplicate file 默认标记为 `duplicate_file`，跳过自动重跑
- parser 调 OpenAI 只返回严格 `ReceiptParsePayload`
- `originData` 字段名保留，但新语义固定为“已校验 parser DTO 快照”

### 2. Planner 审批式落库

- planner 调 OpenAI 返回严格 `ReceiptPlannerPayload`
- 本地执行 prerequisite reads，补齐 counterparty lookup 与 duplicate lookup
- planner artifacts 落入：
  - `planner_read_tasks`
  - `candidate_records`
  - `workflow_write_proposals`
  - `workflow_audit_events`
- `counterparties` 与 final `records` 必须逐 proposal 审批
- 本地运行时只允许补强和校验远端 planner，不允许在远端缺关键段时伪造完整计划

### 3. Ledger Review Workspace

- Parse Review 升级为 workflow review workspace
- 至少展示：
  - parser artifact
  - planner artifact
  - batch state / planner summary / warnings
  - read tasks / duplicate / ambiguity 提示
  - write proposals
  - candidate records
  - 可编辑字段：`Amount`、`Date`、`Source`、`Target`

## 验收标准

- [x] 上传后会生成 `upload_batch`
- [x] parser 与 planner 都有独立持久化 run
- [x] parser/planner DTO 校验失败会明确落失败状态并可重试
- [x] counterparty proposal 与 final record proposal 可单独审批
- [x] Home 仍只读取 final `records`
- [x] 新增 workflow 文档与项目 skill
- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] `pnpm contract:check`
- [ ] `pnpm smoke`

## 参考工件

- `docs/upload-planner-workflow.md`
- `.cursor/skills/project/receipt-parse/SKILL.md`
- `.cursor/skills/project/receipt-db-update-planner/SKILL.md`
