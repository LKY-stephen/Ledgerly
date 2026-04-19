# feat：登录页 UI/文案优化（login_opt）

| 字段 | 值 |
|------|-----|
| **feat id** | `login_opt` |
| **类型** | 前端 UI / 文案（默认**不**改存储契约） |
| **依赖** | 先有 `login_and_tab` 的主题、多语言、Apple 登录与游客态；本 feat 在其之上做视觉与文案收敛 |

**公用约定**：以 `.cursor/prd/agent-dev-guide-summary.md` 为准。仓库级 Agent 基线：`.cursor/rules/ledgerly-always.mdc`。结构参考 `.cursor/prd/TEMPLATE.md`。

## 平台描述

为多平台收入创作者提供统一财务控制台；登录页是首屏之一，需在**不改变认证与路由逻辑**的前提下，提升科技感、可读性与极简表达。

## 存储与契约影响（必填）

- **结构化 DB / 文件仓**：`无变更`（若实现中发现需新增偏好键或登录相关持久化字段，须改为 `需改契约` 并走 schema-first）。
- **须同步的工件**（纯 UI/文案时勾选「无」或保留未勾选直至有变更）：  
  - [ ] `packages/storage/src/contracts.ts`  
  - [ ] `docs/contracts/`  
  - [ ] `packages/schemas`  
  - [ ] 自动化测试（契约或功能）  
- **说明**：默认仅调整 `LoginScreen` 呈现与 `copy` 字符串；会话与 `AppShell` 行为不变。

## 需求描述

### 必须保留（行为真源，勿删改逻辑）

- Apple 登录、不可用/取消提示、游客「暂不登录」→ `continueAsGuest` → `/(tabs)`。
- `isHydrated` 前 `LaunchScreen`；已登录 `Redirect` 至 `/(tabs)`。
- 颜色与文案来源继续走 `useAppShell()` 的 `palette` / `copy`（与明暗主题、多语言一致）。

### 本 feat 目标

- **视觉**：偏科技感、层次清晰；与现有 `palette` 体系一致，避免硬编码与主题打架。
- **交互**：按钮与反馈明确、误触成本低；保持当前流程步骤数不增加。
- **文案**：极简——去掉冗余说明，保留必要错误/状态提示；**多语言**：改 `copy` 时同步 `apps/mobile/src/features/app-shell/copy.ts` 中已有语言键，勿只改单一语言。

### 范围边界

- **包含**：`LoginScreen` UI、样式、`copy.login.*` 相关文案与布局。
- **不包含**：新增第三方登录、后端、修改 SQLite/文件仓契约、Tab 与「我的」设置页（除非仅为复用组件的小幅抽取且无副作用）。

## 主要代码锚点（Dev 优先改这里）

- `apps/mobile/src/features/auth/login-screen.tsx` — 登录页 UI。
- `apps/mobile/src/features/app-shell/copy.ts` — `login` 文案与 i18n。
- `apps/mobile/app/login.tsx` — 路由入口（通常无需改）。

## 验收标准（可勾选、可举证）

- [ ] **功能**：Apple 登录成功 / 取消 / 不可用三种路径仍符合当前行为；游客进入 Tab 与未登录拦截一致。
- [ ] **主题**：浅色 / 深色下对比度可读，无未使用 `palette` 的「死色」大块（Harness 可要求截图或录屏）。
- [ ] **多语言**：切换语言后登录页文案齐全、无漏键或英文硬编码残留（以 `copy` 结构为准）。
- [ ] **极简**：主屏营销/说明性长文案已收敛；必要提示（如 Apple 不可用）仍可见。
- [ ] **门禁**：`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`、`pnpm contract:check`、`pnpm smoke` 通过；手工冒烟见 `tests/smoke/README.md` 中与登录相关的步骤（若 Testor 已写入）。
- [ ] **文档**：若用户可见流程变化，同步 `apps/mobile` 或根 `README` 中与登录相关的简短说明（仅当确有变更时）。

## 参考 Skill

- `.cursor/skills/project/expo`（RN / Expo 实现优先）

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

- 具体 UI 走查与场景表由 **Testor** 按 `.cursor/rules/work_flow.md` 产出；**Harness** 对验收项勾选须有证据（截图/报告/CI）。
