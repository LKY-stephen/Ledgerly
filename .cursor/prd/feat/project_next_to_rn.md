# 项目架构初始调整

**公用约定**：以 `.cursor/prd/agent-dev-guide-summary.md` 为准；结构参考 `.cursor/prd/TEMPLATE.md`。Cursor 始终应用：`.cursor/rules/ledgerly-always.mdc`。

## 存储与契约影响

- **结构化 DB / 文件仓**：`需改契约`（由 Web/Next 转向 RN 本地 SQLite + 文件仓）
- **须同步的工件**（本需求目标）：  
  - [ ] `packages/storage/src/contracts.ts`  
  - [ ] `docs/contracts/`  
  - [ ] `packages/schemas`  
  - [ ] 自动化测试  
- **说明**：前端直连本地存储；无后端阶段不引入服务端 API 契约。

## 需求描述

- 为多平台收入创作者提供统一财务控制台（收入归集、开票、成本、税务预估、现金流、stablecoin 收款等方向的聚合产品）。
- 将 Next.js 前端架构切换为 RN（Expo）架构。
- 数据侧：结构化库 + 文件仓均在前端（本地）；侧重前端直连本地存储；**暂不引入后端**。
- 按指南与仓库真源搭建/调整架构、规范与测试；README 目录说明随架构更新。

## 验收标准

- [ ] 架构初始化 / 调整完成
- [ ] 符合指南与仓库真源
- [ ] 代码规范、格式、目录结构、测试用例
- [ ] README 规范、清晰

## 参考 Skill

- `.cursor/skills/project`
- **RN/Expo**：`.cursor/skills/project/expo`（优先；见摘要 **Skill 选用**）

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

## 本需求补充

- `project_next_to_rn` 完结后须在 `.cursor/context/` **新建** `{semver}_context.md` 留存该版本快照；**禁止**覆盖或删改既有 `*_context.md`；可按摘要同步 `main.md`。
- 验证与门禁见摘要 **交付前检查** 与 **Feat PRD 公用约定**。
