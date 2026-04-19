# feat：底部 Tab 图标 + 首页数据展示优化（home_tab_opt）

| 字段 | 值 |
|------|-----|
| **feat id** | `home_tab_opt` |
| **类型** | 前端 UI / 动效（默认**不**改存储契约） |
| **依赖** | 已有 `(tabs)` 四 Tab（home / ledger / discover / profile）与 `AppShell` 主题、文案体系 |

**公用约定**：以 `.cursor/prd/agent-dev-guide-summary.md` 为准。仓库级 Agent 基线：`.cursor/rules/ledgerly-always.mdc`。结构参考 `.cursor/prd/TEMPLATE.md`。

## 平台描述

为多平台收入创作者提供统一财务控制台；**已登录用户**在 Tab 与首页停留时间最长。本 feat 在**不改变 Tab 路由数量、认证与数据契约**的前提下，用 SVG Tab 图标 + 轻动效提升辨识度，并在首页用**图标化数据块**提升扫读与轻交互。

## 存储与契约影响（必填）

- **结构化 DB / 文件仓**：`无变更`（若为实现偏好项等需持久化新字段，须改为 `需改契约` 并走 schema-first）。
- **须同步的工件**（纯 UI/动效时保持未勾选直至有变更）：  
  - [ ] `packages/storage/src/contracts.ts`  
  - [ ] `docs/contracts/`  
  - [ ] `packages/schemas`  
  - [ ] 自动化测试（契约或功能）  
- **说明**：默认只动 Tab 栏呈现与首页布局/组件；`bootstrapLocalStorage` 与业务数据结构不变。

## 需求描述

### 必须保留（行为真源，勿删改逻辑）

- Tab 仍为 `index` / `ledger` / `discover` / `profile` 四屏；未登录仍 `Redirect` 至 `/login`。
- 颜色与 Tab 标题文案继续走 `useAppShell()` 的 `palette` / `copy.tabs.*`，避免硬编码与主题打架。
- 首页现有数据来源（如 `buildHomeSections`、`bootstrapStatus`、`StatPill` / `SectionCard`）可复用；**勿为「好看」伪造业务数据**。

### 本 feat 目标

1. **底部 Tab 图标**  
   - 使用 **SVG**（或项目内等价的矢量组件，如 `react-native-svg`）作为各 Tab 的 `tabBarIcon`，替换当前骨架/占位/不一致的图标表现。  
   - **切换 Tab 时**对当前选中（或按下）图标做**轻微晃动**类动效（幅度小、时长短，避免眩晕）；需与 React Navigation / Expo Router `Tabs` 的 `tabBarIcon` / `listeners` 等 API 兼容。

2. **首页数据展示**  
   - 在现有 hero / pills / 区块基础上，增加**带图标的指标或卡片式展示**，提升扫读层次与可点按/可感知的交互（具体布局由 Dev 在 `palette` 内收敛，须深浅色可读）。

### 范围边界

- **包含**：`apps/mobile/app/(tabs)/_layout.tsx` 的 Tab 栏图标与动效；`HomeScreen` 及相关 `sections` / UI 组件在**不造假数据**前提下的展示优化；必要时 `copy.home.*` 新增键（多语言同步 `copy.ts`）。
- **不包含**：新增第五个 Tab、改登录/会话逻辑、改 SQLite/文件仓契约、Ledger/Discover/Profile 三 Tab **内页**大改版（除非仅为抽取共用小组件且无行为变化）。

## 主要代码锚点（Dev 优先改这里）

- `apps/mobile/app/(tabs)/_layout.tsx` — `Tabs` / `screenOptions` / 各 `Tabs.Screen` 的 `options.tabBarIcon` 与动效挂载点。
- `apps/mobile/src/features/home/home-screen.tsx` — 首页布局与数据块。
- `apps/mobile/src/features/home/sections.ts`（及同目录相关文件）— 首页区块数据结构。
- `apps/mobile/src/features/app-shell/copy.ts` — `tabs` / `home` 等多语言文案。
- `packages/ui` — 若抽取可复用的图标化数据行/卡片，优先在此或 `apps/mobile` 内与现有 `StatPill` / `SectionCard` 风格一致。

## 验收标准（可勾选、可举证）

- [ ] **Tab**：四 Tab 均有清晰可辨的 SVG（或等价矢量）图标；选中/未选中与 `tabBarActiveTintColor` / `tabBarInactiveTintColor` 协调。
- [ ] **动效**：切换 Tab 时有约定的轻晃动（或其它等价的「选中反馈」），无卡顿、无在低端机上的明显掉帧（Testor 可约定设备档）。
- [ ] **首页**：关键数字或状态以图标+文案组合呈现，信息层级优于改动前；深浅色下可读。
- [ ] **数据诚实**：展示数据仍来自现有 hook/sections/bootstrap，无虚构指标。
- [ ] **多语言**：新增或调整的可见文案覆盖 `copy.ts` 已有语言键。
- [ ] **门禁**：`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`、`pnpm contract:check`、`pnpm smoke` 通过；手工冒烟见 `tests/smoke/README.md` 中与 Tab / 首页相关的步骤（若 Testor 已写入）。

## 参考 Skill

- `.cursor/skills/project/expo`（RN / Expo Router + React Navigation Tabs 实现优先）

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
