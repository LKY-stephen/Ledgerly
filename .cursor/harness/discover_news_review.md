# Discover News Workflow Record

## Harness Phase 1: Requirement Breakdown

### Scope In

1. Replace the current Discover placeholder page with a local-first news list.
2. Support pull-to-refresh and load-more behavior without introducing a backend.
3. Add a news detail page reachable from the Discover list.
4. Keep the feature inside the existing mobile shell, theme system, and locale system.
5. Add automated coverage and smoke guidance for the new Discover list/detail behavior.

### Scope Out

1. Any remote API, backend sync, or storage contract changes.
2. Changes to auth, tab count, or non-Discover business flows.
3. Persisting read state, bookmarks, or article caches beyond the in-memory/local module behavior required for this slice.

### Decisions Locked Before Dev

1. News data remains local module data in this phase; pagination is simulated from that source.
2. Refresh resets the list to the first page from the same source of truth rather than implying remote fetch.
3. Detail pages must stay accessible through Expo Router without breaking the existing tab shell.

### Acceptance Table

| Item | Status | Evidence placeholder | Notes |
|---|---|---|---|
| Discover list page | In progress | Discover feature files, tests, manual smoke | Replaces placeholder content |
| Refresh and load more | In progress | Feed model tests, manual smoke | Local pagination only |
| News detail page | In progress | New route, detail screen, tests | Must navigate from list |
| Theme and locale consistency | In progress | `copy.ts`, build output, tests | No hardcoded dead colors |
| Required checks | In progress | `pnpm lint` / `typecheck` / `test` / `build` / `contract:check` / `smoke` | Contract check still required |

## Testor Phase: Acceptance Design

### Requirement Summary

- Test target: replace the Discover placeholder with a local-first news list that supports refresh, load more, and article detail routing.
- Out of scope: remote fetch, backend sync, storage contract changes, read-state persistence, bookmarks.
- Key assumption: refresh and pagination are simulated from local module data and must remain deterministic.

### Executable Acceptance Conditions

1. Discover tab renders a news list from local module data instead of placeholder cards.
2. Pull-to-refresh resets the list to the first page without runtime errors.
3. Load-more appends later pages until the local feed is exhausted.
4. Tapping a list item opens a detail route that shows source, published date, read time, and article body.
5. Discover copy works in the existing locale system and respects shell theme tokens.

### Scenario Matrix

| Scenario | Type | Evidence |
|---|---|---|
| `getNewsPage()` returns first page and cursor | Automated | `apps/mobile/tests/discover-feed.test.ts` |
| `loadMoreNewsPage()` advances and stops at end | Automated | `apps/mobile/tests/discover-feed.test.ts` |
| `refreshNewsPage()` resets to page 1 | Automated | `apps/mobile/tests/discover-feed.test.ts` |
| `getNewsArticleBySlug()` resolves detail / returns null | Automated | `apps/mobile/tests/discover-feed.test.ts` |
| Discover route compiles with detail route | Build smoke | `pnpm build` |
| Manual device path: Discover list -> refresh -> load more -> detail -> back | Manual smoke checklist | `tests/smoke/README.md` |

## Testor Phase: Execution Report

### Scope

- Covered modules: `apps/mobile/src/features/discover/*`, `apps/mobile/app/news/[slug].tsx`, `apps/mobile/src/features/app-shell/copy.ts`, smoke/context docs.
- Environment: local repo, automated CLI validation.

### Cases and Results

| Case | Result | Evidence |
|---|---|---|
| Local feed helpers | Passed | `pnpm --filter @creator-cfo/mobile test` |
| Mobile lint | Passed | `pnpm --filter @creator-cfo/mobile lint` |
| Mobile typecheck | Passed | `pnpm --filter @creator-cfo/mobile typecheck` |
| Monorepo lint | Passed | `pnpm lint` |
| Monorepo typecheck | Passed | `pnpm typecheck` |
| Monorepo test | Passed | `pnpm test` |
| Contract check | Passed | `pnpm contract:check` |
| Web export build | Passed | `pnpm build` |
| Turbo smoke | Passed | `pnpm smoke` |

### Defects

- No automated defects found in this round.
- Manual device or simulator smoke was not executed in this turn; gesture and visual acceptance still need human verification against `tests/smoke/README.md`.

### Smoke Conclusion

- Automated smoke: passed.
- Manual runtime smoke: pending.
- Recommendation: proceed to manual QA on device/simulator before calling the feature fully closed.

## Harness Final Review

### Review Conclusion

- 有条件通过

### Issue Grading

- Blocker: none in automated evidence.
- Major: none in automated evidence.
- Minor: manual device smoke is still pending, so gesture feel and runtime visual polish are not yet backed by human evidence.

### Issue Details

1. Manual Discover runtime verification is still missing.
   - Why it matters: the feature includes pull-to-refresh and route transitions, which compile and test cleanly but still benefit from device confirmation.
   - Impact: release confidence on actual gesture feel and theme/locale presentation remains slightly incomplete.
   - Suggested action: execute the updated Discover smoke path in `tests/smoke/README.md` on simulator or device.

### Verification Suggestions

- Run the manual Discover smoke path on at least one simulator or Expo Go target.
- Confirm zh-CN and en copy on list and detail pages after switching locale in the profile tab.
- Confirm back navigation from detail returns to Discover without visual glitches.

### Report Summary

| Item | Summary |
|---|---|
| Object and scope | User-requested Discover page refactor into a local-first news list with refresh, load more, and detail route; no storage contract changes. |
| Overall conclusion | 有条件通过。Automated evidence is green; manual runtime smoke is still pending. |
| Blocking risk | No current Blocker. Residual risk is limited to manual runtime/gesture confirmation. |
| Evidence summary | `apps/mobile/tests/discover-feed.test.ts`, Discover route/detail implementation, updated locale copy, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm contract:check`, `pnpm smoke`. |
| Next steps | Run manual smoke from `tests/smoke/README.md`, then convert this slice to fully passed if runtime behavior matches. |
| Time semantics | Valid for the current workspace state on 2026-03-27 after the checks listed above. |

### Requirement Progress

| Item | Status | Evidence | Blocker | Notes |
|---|---|---|---|---|
| Discover list page | 待验收 | `apps/mobile/src/features/discover/discover-screen.tsx`, `pnpm build`, updated smoke steps | Manual smoke pending | Local list UI is implemented and exportable |
| Refresh and load more | 待验收 | `apps/mobile/src/features/discover/news-feed.ts`, `apps/mobile/tests/discover-feed.test.ts`, `pnpm smoke` | Manual smoke pending | Logic verified by tests; pull gesture still needs human confirmation |
| News detail page | 待验收 | `apps/mobile/app/news/[slug].tsx`, `apps/mobile/src/features/discover/discover-detail-screen.tsx`, `pnpm build` | Manual smoke pending | Detail route compiles and slug lookup is tested |
| Theme and locale consistency | 待验收 | `apps/mobile/src/features/app-shell/copy.ts`, `pnpm typecheck`, `pnpm build` | Manual smoke pending | Both locales updated; UI readability still needs visual confirmation |
| Required checks | 已通过 | `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm contract:check`, `pnpm smoke` | None | All repo-level gates passed |

- 已通过条数 / 总条数：1 / 5
- 当前主阻塞：缺少人工设备/模拟器冒烟证据，尚未把 Discover 交互项从“待验收”提升为“已通过”
- 距离可交付：完成 `tests/smoke/README.md` 中新增的 Discover 手工路径验证
