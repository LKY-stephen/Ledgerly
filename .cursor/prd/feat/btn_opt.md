# feat：日间模式按钮与 Tab 对比度优化（btn_opt）

| 字段 | 值 |
|------|-----|
| **feat id** | `btn_opt` |
| **类型** | 前端 UI / 主题 token（默认**不**改存储契约） |
| **依赖** | `useAppShell()` → `surfaceThemes`（`packages/ui`）；`(tabs)` 四 Tab 与登录流已存在 |

**公用约定**：以 `.cursor/prd/agent-dev-guide-summary.md` 为准；基线 `.cursor/rules/creator-cfo-always.mdc`；结构参考 `.cursor/prd/TEMPLATE.md`。

## 平台描述

移动端在**日间（light）主题**下，部分**按钮、Tab 栏、可选中块（如 Pill）**出现**底与字同色或对比过低**，导致不可读或难辨认。本 feat 在**不改动路由、认证、数据契约**的前提下，统一拉高 light 下可点击/可选中控件的**前景与背景对比**，并保持与 `palette` 体系一致（避免页面级硬编码新色）。

## 存储与契约影响（必填）

- **结构化 DB / 文件仓**：`无变更`。
- **须同步的工件**（纯 token/UI 时默认不勾选；若新增快照测试再勾）：  
  - [ ] `packages/storage/src/contracts.ts`  
  - [ ] `docs/contracts/`  
  - [ ] `packages/schemas`  
  - [ ] 自动化测试（建议：至少一处 light 主题下关键色或组件快照/单测，**可选**）  
- **说明**：优先调 `SurfaceTokens` 的 light 取值与复用 `palette` 的组件；不引入新业务字段。

## 需求描述

### 必须保留（行为真源）

- Tab 仍为 `index` / `ledger` / `discover` / `profile`；未登录仍 `Redirect` 至 `/login`。
- 颜色与文案仍经 `useAppShell()` 的 `palette` / `copy.*`；**禁止**为单屏写死与 dark/light 冲突的色值（调试页除外需注明）。
- **不**伪造业务数据；本 feat 仅视觉可读性。

### 本 feat 目标（light 主题）

1. **底部 Tab**：`tabBar` / `tabActive` / `tabInactive` 与标签、图标着色协调，**inactive 在 tabBar 背景上仍清晰可辨**（避免浅底+浅字）。
2. **全应用主要页面**：主按钮、次按钮、危险操作、禁用态、轮廓按钮等——**标签文字与填充/描边对比足够**；扫描 **login、home、ledger、discover、profile** 及高频弹层/表单中的 `Pressable` / `TouchableOpacity` / 自定义 CTA。
3. **深色主题回归**：改动以 **light 为主**；dark 侧仅在为共享组件修 bug 时顺带对齐，**不得**整体削弱 dark 可读性。

### 范围边界

- **包含**：`packages/ui/src/tokens.ts` 中 `surfaceThemes.light`；`apps/mobile` 内仍硬编码 `#fff` / `white` 等与 light `ink` 冲突的按钮或 Tab 相关样式；共用按钮/Pill 组件（若存在）在 light 下的 token 使用。
- **不包含**：改版信息架构、新增 Tab、改 `home_tab_opt` 已覆盖的「图标+动效」产品目标（除非仅对比度补丁）；独立后端或契约变更。

## 主要代码锚点（Dev 优先）

- `packages/ui/src/tokens.ts` — `surfaceThemes.light`（`tabBar`、`tabActive`、`tabInactive`、`accent`、`ink`、`paper*` 等与控件对比相关字段）。
- `apps/mobile/app/(tabs)/_layout.tsx` — `tabBarStyle` / `tabBarActiveTintColor` / `tabBarInactiveTintColor`（已接 `palette`，通常 token 修正即可联动）。
- `apps/mobile/src/features/auth/login-screen.tsx` — 登录 CTA / Apple 按钮等与 `palette.appleButtonStyle` 相关表现。
- `apps/mobile/src/features/**` — 检索 `backgroundColor` + 浅色与 `color` 近似的组合；`PreferencePill`、`SectionCard`、表单内按钮等复用组件。

## 验收标准（可勾选、可举证）

- [ ] **Light Tab**：四 Tab 在默认 light 下，选中/未选中标签与图标均易读；无明显「白字白底」或灰字贴浅底。
- [ ] **Light 主流程按钮**：登录与 Tab 内主要 CTA、次要按钮、禁用态在 light 下可区分且文案可读（Testor 可按屏幕列表走查）。
- [ ] **Dark 无回归**：dark 主题下 Tab 与主要按钮对比度不低于改动前（抽样对比截图或现有快照）。
- [ ] **主题来源一致**：新增/调整的可见色优先落在 `SurfaceTokens` 或现有 `palette` 消费路径，避免散落魔法色。
- [ ] **门禁**：`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`、`pnpm contract:check`、`pnpm smoke` 通过；手工冒烟见 `tests/smoke/README.md` 中与登录、Tab 切换相关的步骤。

## 参考 Skill

- `.cursor/skills/project/expo`（RN 主题与导航 Tab）

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

> 角色三角、`work_flow`、交付前 `pnpm` 命令与 `{semver}_context.md` 见 `.cursor/prd/agent-dev-guide-summary.md`。

### 本 feat 补充交付说明

- **Testor**：产出 light 主题走查场景表（至少：登录、四 Tab 首页、含按钮的设置/表单屏）。**Harness**：勾选验收项须附证据（截图或 CI/快照）。
