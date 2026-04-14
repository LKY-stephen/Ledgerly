# [feat 标题]

**公用约定**：以 `.cursor/prd/agent-dev-guide-summary.md` 为准。仓库级 Agent 基线（Cursor 始终应用）：`.cursor/rules/creator-cfo-always.mdc`。

## 平台描述

（产品背景、用户与目标，可简短。）

## 存储与契约影响（必填）

- **结构化 DB / 文件仓**：`无变更` / `仅读` / `需改契约`（若需改契约，列出表/路径/版本意图）
- **须同步的工件**：勾选或写「无」  
  - [ ] `packages/storage/src/contracts.ts`  
  - [ ] `docs/contracts/`  
  - [ ] `packages/schemas`  
  - [ ] 自动化测试（契约或功能）  
- **说明**：（一句话：改什么、为何、是否迁移旧数据）

## 需求描述

（功能与交互；范围边界写清「不包含」。）

## 验收标准

- [ ] 条目 1
- [ ] 条目 2

## 参考 Skill

- `.cursor/skills/project`（按需补充，如 `expo`）

## 外部参考（非真源）

- 默认不写；仅在本需求确实需要借鉴外部开源项目或外部产品时补充。
- 统一参考：`.cursor/prd/references/accounting-open-source-reference.md`
- 仅可作为产品交互、业务流程、计算口径与异常处理的启发式参考，不作为本仓库契约、数据结构或实现真源。

## 公用约定（勿在本文件重复展开）

**一行引用即可**（详见其中 **Feat PRD 公用约定** 小节）：

> 以 `.cursor/prd/agent-dev-guide-summary.md` 为准：流程与角色、`AGENTS.md` / `.cursor/context/main.md` / `{semver}_context.md`、存储 schema-first、`pnpm` 交付前检查、需求闭环后 **新建** `{semver}_context.md` 并按需同步 `main.md`。PDF 指南（若存在）仅作人工补充。

下方仅写 **本 feat 独有** 的补充交付说明（没有则写「无」或删本节）。

### 本 feat 补充交付说明

（可选）例如：必须过某 E2E、设计稿链接、业务方特殊门禁等。
