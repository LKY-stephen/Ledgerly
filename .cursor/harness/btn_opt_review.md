# Btn Opt Workflow Record

## Harness Phase 1: Requirement Breakdown

### Scope In

1. Improve light-theme contrast for the bottom tab bar so active and inactive icon/label states remain readable.
2. Improve light-theme contrast for primary, secondary, destructive, disabled, outline, and similar CTA surfaces across the mobile shell.
3. Prioritize token-driven fixes through `surfaceThemes.light` and existing `palette` consumption paths.
4. Scan the current high-frequency screens called out by the PRD: login, home, ledger, discover, and profile.
5. Add evidence hooks for automated checks and manual smoke covering light-theme readability, with dark-theme regression checks.

### Scope Out

1. Any storage contract, schema, or backend change.
2. Any route, auth, tab count, information architecture, or product interaction redesign.
3. Reworking the existing tab icon animation goal from `home_tab_opt`, except where a pure contrast patch is required.
4. Inventing business data, adding new feature flows, or introducing ad hoc page-level colors that bypass `palette`.

### Decisions Locked Before Dev

1. This feat remains UI/token-only; Dev must not introduce persistence, backend, or contract changes.
2. Fixes should land first in `packages/ui/src/tokens.ts` and then in existing palette-driven consumers; hardcoded one-off colors are only acceptable if explicitly documented as an unavoidable local exception.
3. Light theme is the target; dark theme changes are allowed only when needed to keep shared components coherent and must not reduce existing dark contrast.
4. Acceptance requires evidence for both token-source consistency and user-visible readability on the listed core screens.

### Acceptance Table

| Item | Status | Evidence Placeholder | Notes |
|---|---|---|---|
| Light Tab contrast | 未开始 | `packages/ui/src/tokens.ts`, tab shell screenshots, manual smoke | Inactive state must remain legible on tab background |
| Light CTA/button contrast | 未开始 | Feature file diffs, screen-level screenshots, manual smoke | Includes primary/secondary/destructive/disabled/outline-style actions |
| Dark-theme non-regression | 未开始 | Before/after screenshots or targeted review notes, manual smoke | No overall dark readability downgrade |
| Theme-source consistency | 未开始 | Token diff, code review of palette consumers, grep for hardcoded colors | Avoid magic colors scattered in screens |
| Required checks | 未开始 | `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm build` / `pnpm contract:check` / `pnpm smoke` | Must all pass before closure |

### Risks and Review Focus

1. Token tweaks may improve one surface while silently reducing contrast on another shared component.
2. Light-only fixes can accidentally regress dark mode if shared components assume the old token balance.
3. Hardcoded fallback colors inside screens may hide the real issue and create future inconsistency.
4. The PRD asks for broad CTA scanning; missing one screen with a low-contrast `Pressable` is a quality gap, not a cosmetic detail.

### Progress Ledger

| Requirement | Status | Evidence | Blocker | Notes |
|---|---|---|---|---|
| Light Tab | 未开始 | Pending Dev/Testor evidence | None yet | Needs token and runtime verification |
| Light 主流程按钮 | 未开始 | Pending Dev/Testor evidence | None yet | Scope includes login + four tabs + settings/form-like actions |
| Dark 无回归 | 未开始 | Pending Testor evidence | None yet | Must be checked after token updates land |
| 主题来源一致 | 未开始 | Pending code review evidence | None yet | Prefer shared token path over local overrides |
| 门禁 | 未开始 | Pending CI output | None yet | Root required checks must all be attached |

- 已通过条数 / 总条数：0 / 5
- 当前主阻塞：尚无 Dev 实现与 Testor 证据，当前仅完成 Harness 需求拆解
- 距离可交付：Testor 补齐验收设计，Dev 提交 token/UI 修复与验证证据，再进入 Harness 终审

## Testor Input Summary

- Testor 产物：`.cursor/harness/btn_opt_testor.md`
- Testor 关注点：light 主题下 Tab active/inactive、登录 CTA、Profile Pill / 退出按钮、dark 抽样回归、以及 token 路径一致性。

## Harness Final Review

### 审查结论

- 有条件通过

### 问题分级

- Blocker：无
- Major：无
- Minor：缺少本轮人工设备/模拟器冒烟截图或录屏证据，当前以自动化与代码审查为主

### 问题明细

1. 人工主题走查证据尚未补齐
   - 现象：`tests/smoke/README.md` 已补 light/dark 对比度检查路径，但本轮未执行真实设备或模拟器走查
   - 为什么是问题：本需求以视觉对比度为主，自动化能覆盖 token 对比和构建正确性，但无法替代最终目视确认
   - 影响范围：light/dark 主题下按钮、Tab、Pill 的最终视觉验收
   - 建议修改方向：按 smoke 文档补 light/dark 手工走查截图或录屏，再将本条从“有条件通过”提升为“通过”

### 验证建议

- 在 light 主题下走查登录页、四个 Tab、Profile 页主题/语言 Pill 与退出按钮
- 在 dark 主题下抽样复查同一批 CTA/Tab 对比度
- 切换中英文后确认长文案未导致按钮前景/背景再次贴色

### 汇报结果

| 要素 | 内容 |
|------|------|
| 对象与范围 | `btn_opt`：日间模式按钮与 Tab 对比度优化；范围限于 Expo 移动端 UI/token，不含存储契约与路由变更 |
| 总结论 | 有条件通过 |
| 阻塞与风险 | 无 Blocker；残留风险主要是缺少人工视觉验收截图/录屏 |
| 证据摘要 | `packages/ui/src/tokens.ts`、`apps/mobile/src/features/auth/login-screen.tsx`、`apps/mobile/src/features/navigation/tab-bar-icon.tsx`、`apps/mobile/src/features/profile/profile-screen.tsx`、表单预览与 database demo 的 palette 对齐；`apps/mobile/tests/theme-contrast.test.ts`；`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`、`pnpm contract:check`、`pnpm smoke` 均通过 |
| 下一步 | 按 `tests/smoke/README.md` 完成 light/dark 手工走查；若结果正常，可转为“通过” |
| 时间语义 | 结论基于 2026-03-30 当前工作区状态与上述命令输出 |

### 需求进度（终版）

| Requirement | Status | Evidence | Blocker | Notes |
|---|---|---|---|---|
| Light Tab contrast | 待验收 | `packages/ui/src/tokens.ts`, `apps/mobile/src/features/navigation/tab-bar-icon.tsx`, `apps/mobile/tests/theme-contrast.test.ts`, `pnpm build` | Manual smoke pending | token 与选中容器已增强，自动化通过 |
| Light 主流程按钮 | 待验收 | `apps/mobile/src/features/auth/login-screen.tsx`, `apps/mobile/src/features/profile/profile-screen.tsx`, `apps/mobile/src/features/form-1099-nec/form-1099-nec-preview.tsx`, `apps/mobile/src/features/form-schedule-c/form-schedule-c-preview.tsx`, `apps/mobile/src/features/database-demo/database-hooks-demo.native.tsx`, `pnpm test` | Manual smoke pending | 主要 CTA/Pill 已对齐 palette 与前景色 |
| Dark 无回归 | 待验收 | `apps/mobile/tests/theme-contrast.test.ts`, code review of shared CTA foreground logic, `pnpm smoke` | Manual smoke pending | dark 侧做了共享按钮前景保护，但仍需人工抽样 |
| 主题来源一致 | 已通过 | token diff, palette-driven consumer changes, grep/code review for current touched surfaces | None | 本次改动优先落在 token 与 palette 消费路径 |
| 门禁 | 已通过 | `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm contract:check`, `pnpm smoke` | None | 仓库级检查全部通过 |

- 已通过条数 / 总条数：2 / 5
- 当前主阻塞：缺少人工 light/dark 主题视觉冒烟证据
- 距离可交付：执行 `tests/smoke/README.md` 中新增的对比度走查路径，并补齐截图/录屏

## Testor Evidence Linked

- Test design and execution record: `.cursor/harness/btn_opt_testor.md`
- Automated evidence collected:
  - `apps/mobile/tests/theme-contrast.test.ts`
  - `pnpm --filter @ledgerly/mobile lint`
  - `pnpm --filter @ledgerly/mobile typecheck`
  - `pnpm --filter @ledgerly/mobile test`
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`
  - `pnpm contract:check`
  - `pnpm smoke`

## Harness Final Review

### 审查结论

- 有条件通过

### 问题分级

- Blocker：无自动化阻塞项。
- Major：无。
- Minor：缺少设备/模拟器手工视觉验收，light/dark 最终观感仍待人工确认。

### 问题明细

1. 手工视觉验收尚未执行。
   - 现象：自动化检查已经覆盖 token、类型、测试、构建与 smoke，但没有实际设备或模拟器走查截图。
   - 为什么是问题：本需求是视觉可读性优化，最终观感仍需要真人确认。
   - 影响范围：登录页、Tab 栏、Profile 控件，以及 home 中已切到 palette 的数据库 demo CTA。
   - 建议方向：按 `tests/smoke/README.md` 中新增的 light/dark 对比度步骤执行一次手工 smoke。

### 验证建议

- 在 light 主题下手动核对登录 skip、游客入口、Apple/降级按钮、四个 Tab、Profile pills、退出登录按钮。
- 切到 dark 主题后抽样复查同一批控件，确认没有肉眼可见回归。
- 切换中英文，确认更长/更短文案不会重新造成低对比或布局挤压。

### 汇报结果

| 要素 | 内容 |
|---|---|
| 对象与范围 | `btn_opt`：light 主题按钮与 Tab 对比度优化；不涉及路由、认证与存储契约。 |
| 总结论 | 有条件通过。自动化证据齐全，手工视觉 smoke 待补。 |
| 阻塞与风险 | 当前无 Blocker；残余风险集中在设备/模拟器上的最终视觉观感确认。 |
| 证据摘要 | token 调整、登录 CTA 修正、Tab 选中容器修正、数据库 demo CTA 改为 palette 驱动、`theme-contrast.test.ts`、以及 `pnpm lint/typecheck/test/build/contract:check/smoke` 全通过。 |
| 下一步 | 执行 `tests/smoke/README.md` 中的 light/dark 手工走查；若通过，可将本需求转为完全通过。 |
| 时间语义 | 本结论基于 2026-03-30 当前工作区状态与上述命令结果。 |

### 需求进度

| Requirement | 状态 | 证据 | Blocker | Notes |
|---|---|---|---|---|
| Light Tab contrast | 待验收 | `packages/ui/src/tokens.ts`, `apps/mobile/src/features/navigation/tab-bar-icon.tsx`, `apps/mobile/tests/theme-contrast.test.ts`, `pnpm build` | 手工 smoke 待补 | 自动化对比度与构建已通过 |
| Light 主流程按钮 | 待验收 | `apps/mobile/src/features/auth/login-screen.tsx`, `apps/mobile/src/features/database-demo/database-hooks-demo.native.tsx`, `apps/mobile/tests/theme-contrast.test.ts`, `pnpm test` | 手工 smoke 待补 | 关键 CTA 已切回 palette 驱动且自动化通过 |
| Dark 无回归 | 待验收 | `apps/mobile/tests/theme-contrast.test.ts`, `pnpm smoke` | 手工 smoke 待补 | 自动化仅覆盖 Tab/readability，不替代视觉回归 |
| 主题来源一致 | 已通过 | `packages/ui/src/tokens.ts`, `apps/mobile/src/features/auth/login-screen.tsx`, `apps/mobile/src/features/navigation/tab-bar-icon.tsx`, `apps/mobile/src/features/database-demo/database-hooks-demo.native.tsx` | 无 | 本次新增/调整均优先走 token 或 palette 路径 |
| 门禁 | 已通过 | `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm contract:check`, `pnpm smoke` | 无 | 所有 Required Checks 已通过 |

- 已通过条数 / 总条数：2 / 5
- 当前主阻塞：缺少手工视觉 smoke 证据，影响其余 3 项从“待验收”转“已通过”
- 距离可交付：完成 `tests/smoke/README.md` 中新增的 light/dark 走查并确认无视觉回归
