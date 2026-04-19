# Home Tab Opt Workflow Record

## Harness Phase 1: Requirement Breakdown

### Scope In

1. Add vector tab icons for the existing four-tab shell and keep labels driven by `copy.tabs.*`.
2. Add a lightweight selected-tab motion cue without changing the route structure.
3. Rework Home tab presentation so real, existing data reads as icon-led metric cards instead of plain text-only blocks.
4. Keep the work theme-safe and multi-language-safe inside the existing `palette` and `copy` system.
5. Add or update automated coverage for the new tab/home configuration and visible copy/data shape.

### Scope Out

1. Any new tab, route change, login/session change, or auth behavior change.
2. Any storage contract or bootstrap contract change.
3. Any large redesign of Ledger / Discover / Profile inner screens beyond shared icon reuse.

### Decisions Locked Before Dev

1. This feat remains UI-only unless implementation proves otherwise; no new persistence is allowed.
2. Home metrics must be derived from existing sources such as `buildHomeSections`, `bootstrapStatus`, contracts, and supported platform counts.
3. SVG support is acceptable through Expo-compatible `react-native-svg`, but it must not trigger unrelated architectural changes.

### Acceptance Table

| Item | Status | Evidence placeholder | Notes |
|---|---|---|---|
| Tab icons for four routes | Passed | `app/(tabs)/_layout.tsx`, `src/features/navigation/*`, `tests/tab-config.test.ts` | Route count remains four |
| Selected-tab motion feedback | Passed | `tab-bar-icon.tsx`, `pnpm build`, `pnpm smoke` | Motion stays subtle and focus-only |
| Home icon-led metrics | Passed | `home-screen.tsx`, `sections.ts`, `tests/sections.test.ts` | Uses existing contract and bootstrap data |
| Theme / locale consistency | Passed | `copy.ts`, build output, tests | No dead colors or missing keys |
| Required checks | Passed | `pnpm lint` / `typecheck` / `test` / `build` / `contract:check` / `smoke` | Contract check passed unchanged |

## Testor Phase: Acceptance Conditions

### Requirement Understanding

- Test the four existing tabs only; no route count or auth guard changes are allowed.
- Verify that icons and motion are visible but subtle, and that Home metrics remain honest to existing data sources.
- Treat this feat as UI-only: no contract or persistence changes should appear unless implementation forces them.

### Executable Acceptance Conditions

1. The tab shell still exposes exactly `index`, `ledger`, `discover`, and `profile`.
2. Each tab renders an SVG-backed icon with active/inactive coloring driven by `palette`.
3. Focused tabs show a small animated selection cue without changing navigation behavior.
4. Home uses icon-led metric cards whose values come from existing section/bootstrap data.
5. Any new visible copy is present for both `en` and `zh-CN`.
6. Root required checks pass unchanged.

### Scenario Matrix

| Scenario | Expected result |
|---|---|
| Logged-in shell render | Four tabs appear with clear vector icons |
| Tab change | Selected icon animates lightly and active tint updates |
| Light / dark theme | Tab icons and Home metric cards remain readable |
| Home render | Hero and storage areas show icon-led metric cards with real values |
| Locale switch | New Home and Tab labels remain complete in both languages |
| Contract check | Storage contract tests remain green with no contract diff required |

### Smoke Path

1. Run `pnpm --filter @ledgerly/mobile start`.
2. Enter the tab shell and verify all four tabs show vector icons.
3. Switch tabs and confirm the selected icon gives a subtle wobble/selection cue.
4. On Home, verify modules, platforms, bootstrap, storage, and device-state cards render with icons and real counts.
5. Switch theme and language from Me, then return to Home and confirm readability plus localized labels.
6. Run the root required checks.

## Testor Phase: Execution Report

### Coverage

- Static verification completed for tab config, icon components, Home data shaping, and localized copy additions.
- Automated verification completed through new `tab-config` and updated `sections` tests plus the full root required check set.
- Manual smoke checklist updated for tab icons and Home metrics.

### Result Summary

| Check | Result | Evidence |
|---|---|---|
| Four-tab shell retained | Passed | `apps/mobile/app/(tabs)/_layout.tsx`, `apps/mobile/tests/tab-config.test.ts` |
| SVG icons + motion | Passed | `apps/mobile/src/components/app-icon.tsx`, `apps/mobile/src/features/navigation/tab-bar-icon.tsx`, `pnpm build` |
| Honest Home metrics | Passed | `apps/mobile/src/features/home/home-screen.tsx`, `apps/mobile/src/features/home/sections.ts`, `apps/mobile/tests/sections.test.ts` |
| Multi-language additions | Passed | `apps/mobile/src/features/app-shell/copy.ts`, tests, build output |
| Required checks | Passed | `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm contract:check`, `pnpm smoke` |

### Defects

- None blocking.
- Residual limitation: smoothness of the tab wobble is verified through build/smoke and code review here, but still benefits from one manual pass on lower-end devices.

### Smoke Conclusion

- Current version is ready for Harness review.

## Harness Final Review

### Conclusion

Passed

### Blocker

- None.

### Major

- None.

### Minor

- Expo web export still emits the non-blocking `NO_COLOR` environment warning during `pnpm build` and `pnpm smoke`.
- Turbo still warns that some tasks do not emit configured outputs, but the commands complete successfully.

### Verification Advice

1. Do one manual pass on a physical device or slower simulator to sanity-check the icon wobble cadence.
2. Keep `copy.home.*` synchronized across both locales when adding new metric labels or section eyebrows.
3. If more icon-led surfaces are planned, consider consolidating `apps/mobile/src/components/app-icon.tsx` into a broader shared visual language later.

### Report Summary

| Element | Content |
|---|---|
| Object and scope | PRD `home_tab_opt.md`; four-tab icons, subtle tab motion, and Home data presentation only |
| Overall conclusion | Passed |
| Blocking risk | No blockers; routes, auth, and contracts remained unchanged |
| Evidence summary | SVG dependency installed, new icon/navigation components added, Home data blocks refactored, tests and full required checks passed |
| Next step | Perform quick manual device smoke, then continue the next Home / Ledger feature slice |
| Time semantics | Conclusion valid for the current workspace state on 2026-03-27 after the passing command set |

### Progress Table

| Item | Status | Evidence | Blockers | Notes |
|---|---|---|---|---|
| Tab：四 Tab 图标清晰可辨 | 已通过 | `apps/mobile/app/(tabs)/_layout.tsx`, `apps/mobile/src/components/app-icon.tsx` | None | 继续保持四路由 |
| 动效：选中反馈轻微 | 已通过 | `apps/mobile/src/features/navigation/tab-bar-icon.tsx`, `pnpm smoke` | None | 使用轻量 wobble 动效 |
| 首页：图标化数据块 | 已通过 | `apps/mobile/src/features/home/home-screen.tsx`, `apps/mobile/src/features/home/sections.ts` | None | 数值继续来自真实现有数据 |
| 数据诚实：无虚构指标 | 已通过 | `sections.ts`, `bootstrapStatus`, tests | None | 仅重排已有数据源 |
| 多语言：新增文案覆盖 | 已通过 | `apps/mobile/src/features/app-shell/copy.ts`, tests | None | Home 新增键双语齐全 |
| 门禁：必检通过 | 已通过 | `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm contract:check`, `pnpm smoke` | None | 契约无变更但检查已完成 |

已通过条数 / 总条数：6 / 6

当前唯一主阻塞：无

距离可交付：自动化门禁已满足，仅建议补一次真机 / 模拟器的动效肉眼确认。
