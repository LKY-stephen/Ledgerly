# 搭建黑夜，白天模式，定义好颜色规范体系，以及多语言架构，首页骨架以及appleID登录体系

**公用约定**：以 `.cursor/prd/agent-dev-guide-summary.md` 为准（流程、契约真源、`pnpm` 门禁、完结后更新 `main.md`）；结构参考 `.cursor/prd/TEMPLATE.md`。Cursor 始终应用：`.cursor/rules/ledgerly-always.mdc`。

## 平台描述

- 为多平台收入创作者提供统一财务控制台（收入归集、开票、成本、税务预估、现金流、stablecoin 收款等方向的聚合产品）。

## 存储与契约影响

- **结构化 DB / 文件仓**：待 Harness 拆解后定为 `无变更` / `仅读` / `需改契约`（主题、语言、登录态若需持久化，须对照 `AGENTS.md` 走 schema-first）
- **须同步的工件**（实现时按实际勾选）：  
  - [ ] `packages/storage/src/contracts.ts`  
  - [ ] `docs/contracts/`  
  - [ ] `packages/schemas`  
  - [ ] 自动化测试  
- **说明**：Apple 登录与游客态若写入本地，需明确契约与测试；纯 UI 主题/语言可先 `无变更` 或仅偏好存储（仍须契约若新增键）。

## 需求描述

- UI 参考 Flyfin 等，偏科技感、交互人性化。
- 首页骨架：底部四 Tab — 首页、记账、发现、我的。
- 登录：Apple ID 一键登录；右上角「暂不登录」；支持游客模式。
- 「我的」设置：多语言、明暗主题切换。

## 验收标准

- [ ] 首页骨架模块
- [ ] 登录模块
- [ ] 黑夜 / 白天模式，多语言
- [ ] UI、交互符合上文需求描述
- [ ] README 规范、清晰

## 参考 Skill

- `.cursor/skills/project`
- `.cursor/skills/project/expo`（RN / Expo 实现时优先）

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

## 本需求补充（非公用部分）

- 架构正确、代码规范、指南与验收项对应功能**测试通过**、交互与 UI 达标 — 具体验证方式由 Testor 按 `work_flow` 产出场景与报告；门禁命令见摘要 **交付前检查**。
