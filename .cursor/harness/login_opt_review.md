# Login Opt Workflow Record

## Harness Phase 1: Requirement Breakdown

### Scope In

1. Optimize the login screen visual hierarchy and polish within the existing `palette` system.
2. Shorten and refine `copy.login.*` text for both English and Chinese.
3. Preserve all current auth and routing behaviors: Apple sign-in, unavailable/cancel messaging, guest mode, hydration gate, and redirects.
4. Add lightweight automated coverage that protects the optimized login copy/model shape.

### Scope Out

1. Any auth provider change, backend, token flow, or route guard change.
2. Any storage contract, persisted session shape, or AppShell session logic change.
3. Tab screens, Me settings, or other app-shell pages beyond tiny reuse-safe extraction.

### Decisions Locked Before Dev

1. This feat is UI/copy only by default and must not expand persistence.
2. Any new login copy keys must be added for both supported locales in `copy.ts`.
3. Tests should focus on copy/model completeness and existing behavior assumptions, not introduce new auth mocks unless necessary.

### Acceptance Table

| Item | Status | Evidence placeholder | Notes |
|---|---|---|---|
| Login behavior unchanged | Passed | `login-screen.tsx`, provider / route files, `pnpm test` | No routing or auth logic rewrite |
| Theme-safe visual polish | Passed | `login-screen.tsx`, `pnpm build`, `pnpm smoke` | Palette-driven layout retained |
| Multi-language login copy complete | Passed | `copy.ts`, `tests/login-copy.test.ts` | Both locales updated together |
| Copy simplified | Passed | `copy.login.*` diff, manual review, build output | Kept only essential status messaging |
| Required checks | Passed | `pnpm lint` / `typecheck` / `test` / `build` / `contract:check` / `smoke` | Contract check still required and passed |

## Testor Phase: Acceptance Conditions

### Requirement Understanding

- Test only the login surface polish: layout, readability, theme alignment, and localized copy.
- Do not reinterpret this feat as a login-logic change; Apple sign-in, unavailable/cancel states, hydration, guest mode, and redirect behavior must stay intact.
- Treat build and smoke as strong proxies for UI regression because this feat intentionally avoids storage and session changes.

### Executable Acceptance Conditions

1. `LoginScreen` still calls the same guest and Apple handlers and keeps the same redirect behavior.
2. The login page uses `palette`-driven colors only; light and dark themes remain readable.
3. `copy.login` stays complete for both locales when fields are added or changed.
4. Default copy is visibly shorter and more focused than the previous iteration while still exposing Apple state feedback.
5. Root required checks continue to pass.

### Scenario Matrix

| Scenario | Expected result |
|---|---|
| Cold start on signed-out state | Refined login UI appears without route or session regression |
| Apple unavailable | Status panel shows unavailable guidance and guest CTA remains available |
| Apple cancel | Status panel shows cancel guidance and flow remains on login |
| Guest continue | Same `continueAsGuest` path routes into `/(tabs)` |
| Locale switch | All login strings update with no missing keys |
| Theme switch | Background, card, chips, and buttons remain readable without dead colors |

### Smoke Path

1. Run `pnpm --filter @ledgerly/mobile start`.
2. Confirm the refined login page shows the shorter hero copy, signal chips, Apple CTA, and guest CTA.
3. Trigger the guest path and confirm the app still enters `/(tabs)`.
4. Return to login and switch theme / locale from the shell to confirm the login page remains readable.
5. On unsupported environments, confirm the Apple unavailable message appears in the status panel.

## Testor Phase: Execution Report

### Coverage

- Static verification completed for `copy.login.*`, `LoginScreen` layout, and unchanged route entry.
- Automated verification completed through the new login copy test plus the full root required check set.

### Result Summary

| Check | Result | Evidence |
|---|---|---|
| Login behavior unchanged | Passed | `apps/mobile/src/features/auth/login-screen.tsx`, `apps/mobile/app/login.tsx` |
| Theme-aware visual structure | Passed | `apps/mobile/src/features/auth/login-screen.tsx`, `pnpm build` |
| Multi-language login copy | Passed | `apps/mobile/src/features/app-shell/copy.ts`, `apps/mobile/tests/login-copy.test.ts` |
| Full repo gate set | Passed | `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm contract:check`, `pnpm smoke` |

### Defects

- None blocking.
- Residual limitation: this feat still relies on manual device smoke for real Apple sign-in UI on supported iOS hardware, same as the previous slice.

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

- Expo web export still emits the non-blocking `NO_COLOR` environment warning during `pnpm build` / `pnpm smoke`.
- Turbo still warns about missing test outputs for cached tasks, but the commands complete successfully.

### Verification Advice

1. If the team wants stronger UI regression protection later, consider adding a pure `buildLoginViewModel` helper or snapshot-style component test for `LoginScreen`.
2. Keep login copy additions bilateral across `en` and `zh-CN`; `tests/login-copy.test.ts` now acts as the minimum guardrail.
3. Validate the refined login surface on a real device before any design-heavy follow-up PRD.

### Report Summary

| Element | Content |
|---|---|
| Object and scope | PRD `login_opt.md`; login surface visual and copy refinement only |
| Overall conclusion | Passed |
| Blocking risk | No blockers; logic and route behavior remained unchanged |
| Evidence summary | Refined `LoginScreen`, updated bilingual `copy.login`, new login copy test, full required checks passed |
| Next step | Run quick manual device smoke if desired, then continue the next shell or ledger/discover PRD |
| Time semantics | Conclusion valid for the current workspace state on 2026-03-27 after the passing command set |

### Progress Table

| Item | Status | Evidence | Blockers | Notes |
|---|---|---|---|---|
| 功能：行为不变 | 已通过 | `apps/mobile/src/features/auth/login-screen.tsx`, `pnpm test` | None | Apple / guest / redirect 逻辑未改 |
| 主题：浅色 / 深色可读 | 已通过 | `apps/mobile/src/features/auth/login-screen.tsx`, `pnpm build` | None | 颜色继续来自 `palette` |
| 多语言：无漏键 | 已通过 | `apps/mobile/src/features/app-shell/copy.ts`, `apps/mobile/tests/login-copy.test.ts` | None | 两种语言键保持一致 |
| 极简：文案收敛 | 已通过 | `copy.login.*` diff, build output | None | 默认文案明显缩短，状态提示保留 |
| 门禁：必检通过 | 已通过 | `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm contract:check`, `pnpm smoke` | None | 合同无变更但仍完成检查 |
| 文档：必要时同步 | 已通过 | `.cursor/context/main.md`, `*_context.md` | None | 用户可见流程未变，README 无需调整 |

已通过条数 / 总条数：6 / 6

当前唯一主阻塞：无

距离可交付：自动化门禁已满足，剩余仅是可选的真机视觉走查。
