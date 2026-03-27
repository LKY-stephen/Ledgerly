# Login And Tab Workflow Record

## Harness Phase 1: Requirement Breakdown

### Scope In

1. Add a login entry experience for the Expo mobile app with Apple sign-in presentation, a top-right skip action, and guest mode.
2. Replace the single dashboard starter with a four-tab shell: Home, Ledger, Discover, and Me.
3. Define a reusable color system with light and dark themes, then expose theme switching in the Me tab.
4. Add a bilingual shell architecture with Chinese and English copy, plus a language switcher in the Me tab.
5. Persist theme, locale, and local session state on device through a documented local contract.
6. Update README, smoke guidance, and context tracking for the new mobile shell.

### Scope Out

1. Any backend, token exchange, or server-side Apple identity verification.
2. Real finance CRUD flows behind the Ledger and Discover tabs beyond a smoke-ready skeleton.
3. Remote sync or cross-device preference sharing.
4. Non-Apple third-party auth providers.

### Decisions Locked Before Dev

1. Theme, locale, and login session state count as local persistence and therefore require a schema-first contract update.
2. Apple sign-in is device-local only in this PRD; unsupported platforms must fail gracefully and keep guest mode available.
3. Multi-language scope is limited to shell copy for the login screen, tabs, dashboard highlights, and Me settings.

### Acceptance Table

| Item | Status | Evidence placeholder | Notes |
|---|---|---|---|
| Home skeleton and four-tab shell | Passed | `apps/mobile/app/(tabs)/*`, `apps/mobile/src/features/home/*`, `pnpm build` | Four-tab shell renders through Expo Router |
| Login module | Passed | `apps/mobile/app/login.tsx`, `apps/mobile/src/features/auth/login-screen.tsx`, `apps/mobile/src/features/app-shell/*` | Apple sign-in degrades gracefully outside supported iOS devices |
| Light and dark themes plus multi-language | Passed | `packages/ui/src/tokens.ts`, `apps/mobile/src/features/app-shell/copy.ts`, `apps/mobile/src/features/profile/profile-screen.tsx`, `apps/mobile/tests/app-shell-model.test.ts` | Persisted with AsyncStorage contract |
| UI and interaction quality | Passed | `pnpm build`, `pnpm smoke`, updated smoke checklist | Manual device smoke still recommended for real Apple auth |
| README clarity | Passed | `README.md`, `tests/smoke/README.md`, `.cursor/context/main.md`, `*_context.md` | Docs aligned to mobile shell |

## Testor Phase: Acceptance Conditions

### Requirement Understanding

- Test the mobile shell only: login entry, guest mode, tab navigation, theme switching, and locale switching.
- Do not treat Apple sign-in as a backend-authenticated session; success means the app can capture and persist a local session summary when the device supports Apple Authentication.
- Treat web and unsupported native environments as valid preview surfaces that must degrade gracefully.

### Executable Acceptance Conditions

1. Cold start routes a signed-out user to the login screen and a persisted session to the tab shell.
2. The login screen exposes Apple sign-in affordance, "skip for now", and a guest path without crashing on unsupported platforms.
3. The app shell renders four tabs with localized labels and screen copy.
4. Theme and locale changes are reflected immediately and survive app reload through local persistence.
5. The Me tab can sign the user out and return to the login entry.
6. Storage contract docs and automated tests cover the new persisted keys.

### Scenario Matrix

| Scenario | Expected result |
|---|---|
| Signed-out cold start | Login screen renders with Apple CTA and skip action |
| Skip login | Guest session persists and redirects into the tab shell |
| Supported Apple login | Local Apple session summary persists and routes into the tab shell |
| Unsupported Apple login environment | CTA degrades gracefully with guidance; guest path still works |
| Theme switch | Light/dark tokens update shell surfaces immediately and persist |
| Locale switch | Chinese/English copy updates immediately and persist |
| Sign out from Me | Session is cleared and login screen returns |
| Contract check | Device state keys are documented and covered by tests |

### Smoke Path

1. Run `pnpm --filter @creator-cfo/mobile start`.
2. On cold start, verify the login screen appears with Apple sign-in and skip affordance.
3. Use "skip for now" to enter the guest flow, then confirm Home, Ledger, Discover, and Me tabs render.
4. In Me, switch theme and language, then confirm the shell updates without reload.
5. Sign out and confirm the app returns to login.
6. On a supported iOS device, validate the Apple login branch.
7. Run `pnpm contract:check` and the root required checks.

## Testor Phase: Execution Report

### Coverage

- Automated verification completed for storage contracts, app-shell state model, localized home content, root lint, typecheck, test, build, contract check, and smoke.
- Manual smoke instructions updated for the login gate, guest mode, tab navigation, theme switch, language switch, and sign-out flow.

### Result Summary

| Check | Result | Evidence |
|---|---|---|
| Signed-out gate and routed shell | Passed | `apps/mobile/app/index.tsx`, `apps/mobile/app/login.tsx`, `apps/mobile/app/(tabs)/_layout.tsx` |
| Apple login + guest flow | Passed | `apps/mobile/src/features/auth/login-screen.tsx`, `apps/mobile/src/features/app-shell/provider.tsx` |
| Theme and locale persistence | Passed | `packages/storage/src/contracts.ts`, `apps/mobile/src/features/profile/profile-screen.tsx`, `apps/mobile/tests/app-shell-model.test.ts` |
| Home skeleton and tab content | Passed | `apps/mobile/src/features/home/home-screen.tsx`, `apps/mobile/tests/sections.test.ts` |
| Shared checks | Passed | `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm contract:check`, `pnpm smoke` |

### Defects

- None blocking in automated verification.
- Residual limitation: Apple Authentication still needs a real supported iOS device for end-to-end manual validation, because this PRD intentionally has no backend.

### Smoke Conclusion

- Current version is ready for Harness review and manual device verification.

## Harness Final Review

### Conclusion

Passed

### Blocker

- None.

### Major

- None.

### Minor

- `pnpm build` and `pnpm smoke` emit non-blocking Turbo warnings about missing output files for some package build/test tasks.
- Expo web export emits non-blocking `NO_COLOR` warnings from the environment while still completing successfully.

### Verification Advice

1. Use a supported iOS device or simulator with Apple Sign-In capability to validate the native Apple branch end to end.
2. Keep `packages/storage/src/contracts.ts`, `docs/contracts/local-storage.md`, and contract tests synchronized whenever local preferences or session fields change.
3. If a future PRD introduces backend identity, treat the current `auth_session` record as a temporary local shell contract and plan a migration explicitly.

### Report Summary

| Element | Content |
|---|---|
| Object and scope | PRD `login_and_tab.md`; mobile login gate, four-tab shell, theme, locale, README, and local contracts |
| Overall conclusion | Passed |
| Blocking risk | No open blockers; only residual manual-device validation remains for Apple native flow |
| Evidence summary | Root required checks passed, new mobile tests passed, storage contract docs/tests updated, smoke checklist updated |
| Next step | Run manual device smoke on supported iOS hardware, then continue the first real Ledger or Discover feature PRD |
| Time semantics | Conclusion valid for the current workspace state on 2026-03-27 after the passing command set |

### Progress Table

| Item | Status | Evidence | Blockers | Notes |
|---|---|---|---|---|
| Home skeleton and four-tab shell | 已通过 | `apps/mobile/app/(tabs)/*`, `apps/mobile/src/features/home/*`, `pnpm build` | None | Expo Router shell is in place |
| Login module | 已通过 | `apps/mobile/app/login.tsx`, `apps/mobile/src/features/auth/login-screen.tsx` | None | Guest mode and Apple affordance both exist |
| 黑夜 / 白天模式，多语言 | 已通过 | `packages/ui/src/tokens.ts`, `apps/mobile/src/features/profile/profile-screen.tsx`, tests | None | Persisted with AsyncStorage contract |
| UI、交互符合需求描述 | 已通过 | `pnpm build`, `pnpm smoke`, updated smoke checklist | None | Real Apple path still needs device confirmation |
| README 规范、清晰 | 已通过 | `README.md`, `tests/smoke/README.md`, `.cursor/context/main.md`, `*_context.md` | None | Docs aligned to current slice |

已通过条数 / 总条数：5 / 5

当前唯一主阻塞：无

距离可交付：自动化门禁已满足，剩余建议项是支持 Apple Sign-In 的 iOS 设备手工验证。
