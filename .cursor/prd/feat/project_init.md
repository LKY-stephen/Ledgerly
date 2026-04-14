# 项目架构初始化

**公用约定**：以 `.cursor/prd/agent-dev-guide-summary.md` 为准；结构参考 `.cursor/prd/TEMPLATE.md`。Cursor 始终应用：`.cursor/rules/creator-cfo-always.mdc`。

## 存储与契约影响

- **结构化 DB / 文件仓**：初始化阶段多为 `需改契约`（首版 storage/contracts 与文档）
- **须同步的工件**（本需求目标）：
  - [ ] `packages/storage/src/contracts.ts`
  - [ ] `docs/contracts/`
  - [ ] `packages/schemas`
  - [ ] 自动化测试
- **说明**：以仓库当前 `AGENTS.md` 与 `.cursor/context/main.md`（及已有 `*_context.md` 归档）为准建立基线。

## 需求描述

- 为多平台收入创作者提供统一财务控制台（收入归集、开票、成本、税务预估、现金流、stablecoin 收款等方向的聚合产品）。
- 按指南与仓库真源搭建项目架构，目录可为空或默认状态。
- 定义代码规范、测试与目录结构；架构落地后在 README 中梳理目录说明。

## 验收标准

- [ ] 架构初始化
- [ ] 符合指南与仓库真源
- [ ] 代码规范、格式、目录结构、测试用例
- [ ] README 规范、清晰

## 参考 Skill

- `.cursor/skills/project`
- 移动端相关时：`.cursor/skills/project/expo`（见摘要 **Skill 选用**）

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

- 架构正确、代码规范、指南对齐；验证方式与门禁见摘要 **交付前检查** 与 **Feat PRD 公用约定**。
