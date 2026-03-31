# feat_ui Review Record (Harness)

## Harness Phase 1: Requirement Breakdown

### Scope In

1. On top of the existing Expo Router shell, deliver **Figma-aligned** pure UI for:
   - Login
   - Home (tab home)
   - Ledger (tab)
   - Ledger -> Upload (subflow)
   - Ledger Upload -> Parse (subflow)
2. All list/form data must be **mocked or hardcoded**. Navigation must be clickable end to end.
3. Provide visible UI states (at minimum: empty state, loading state, actionable press feedback).
4. Provide traceability docs: **route -> screen -> Figma node** mapping (PRD suggests `apps/mobile` README or equivalent).
5. Pass repo required checks (root): `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm contract:check`, `pnpm smoke`.

### Scope Out

1. Any backend/API, sync, remote identity, server-side storage.
2. Any persistence schema/contract expansion for the upload/parse flow (no SQLite/file-vault writes for business data).
3. Any real parsing engine, OCR integration, invoice extraction, tax logic.
4. Any "new global theme rewrite" that risks regressions against the already shipped shell (`login_and_tab` slice).

### Current Repo Baseline (Facts)

- Routes already exist for:
  - Login: `apps/mobile/app/login.tsx` -> `LoginScreen`
  - Home tab: `apps/mobile/app/(tabs)/index.tsx` -> `HomeScreen`
  - Ledger tab: `apps/mobile/app/(tabs)/ledger.tsx` -> `LedgerScreen`
- `LedgerScreen` is currently a skeleton card list with copy-driven rows and no upload/parse subflow UI.
- There is no existing `apps/mobile/README.md` in the workspace today (PRD requires adding/updating one).

### Decisions Locked Before Dev (Harness MUST Clarify)

1. **Tab bar presence** on Ledger subflow screens (Upload, Parse).
   - Option A (recommended default): present Upload/Parse as a **modal/stack** screen with **tabs hidden** if Figma shows a focused, full-screen task.
   - Option B: keep tabs visible and push within the Ledger tab stack.
   - Acceptance must explicitly check the chosen behavior matches the Figma node(s).

2. **Route paths** for subflow screens.
   - Dev may add routes, but the PRD requires the PRD itself be updated with the final paths OR the route mapping doc must record them unambiguously.
   - Recommended stable convention (subject to repo patterns): `/ledger/upload` and `/ledger/parse` (or equivalent).

3. **"Figma alignment" tolerance**.
   - Harness baseline: "no obvious deviation" is too vague; we need at least a minimal definition for review.
   - Proposed: accept minor deltas for fonts/spacing that are within a small tolerance, but reject layout/typography hierarchy mismatches, missing states, or wrong component structure.
   - Evidence must include a side-by-side note: each screen -> node-id -> key deltas (if any).

4. **Conflicts with prior `login_and_tab` slice**.
   - If Figma requests changes that conflict with existing tab count, palette tokens, or established shell behavior, Dev must stop and request a Harness ruling before changing global tokens.

## Acceptance Items (Evidence-Driven)

| Item | Status | Evidence placeholder | Notes |
|---|---|---|---|
| A1 Login screen matches Figma | `待验收` | Figma node `2320-3` comparison notes + screenshots; `apps/mobile/src/features/auth/login-screen.tsx` | Login exists today, but Figma parity is not yet evidenced |
| A2 Home screen matches Figma | `待验收` | Figma node `2330-12` comparison notes + screenshots; `apps/mobile/src/features/home/home-screen.tsx` | Home exists today, but likely differs; must reconcile without breaking storage bootstrap widgets unless Figma says so |
| A3 Ledger screen matches Figma | `待验收` | Figma node `2330-6` comparison notes + screenshots; `apps/mobile/src/features/ledger/ledger-screen.tsx` | Ledger exists today as skeleton; needs Figma-aligned layout + actionable entry into upload |
| A4 Ledger -> Upload screen exists and matches Figma | `未开始` | Figma node `2330-9`; new route file(s); screenshots | Must be pure UI; file selection can be mocked (no real file persistence) |
| A5 Upload -> Parse screen exists and matches Figma | `未开始` | Figma node `2330-18`; new route file(s); screenshots | Must show progress/result states with mocked data |
| A6 Navigation path is complete | `未开始` | Manual steps + (optional) automated navigation/unit test; screen recordings | Path: open Ledger -> upload -> parse -> back; press states visible |
| A7 No storage/contract changes introduced | `待验收` | `git diff` shows no edits under `packages/storage`, `packages/schemas`, `docs/contracts`; `pnpm contract:check` | Any accidental contract changes are a blocker |
| A8 At least one automated UI-related test or smoke update exists | `未开始` | New/updated test under `apps/mobile/tests/*` OR `tests/smoke/README.md` update + justification | PRD prefers automated test; smoke-only must be justified and repeatable |
| A9 Route -> Screen -> Figma mapping doc updated | `未开始` | `apps/mobile/README.md` (preferred) with final route paths + node-ids | This is mandatory for traceability |
| A10 Repo required checks pass | `未开始` | Command output summary: `pnpm lint/typecheck/test/build/contract:check/smoke` | Dev must run or explicitly document why it cannot be run |

## Blocker Criteria (Auto-Fail)

- Any persistence/contract changes sneaking in (SQLite schema, file-vault contract, new AsyncStorage keys) without a dedicated schema-first PRD.
- Any screen missing from the 5-screen list, or subflow navigation not clickable end to end.
- Any "Figma alignment" claim without evidence (node-id mapping + screenshots + notes).
- Any runtime red screen / broken routes in Expo Router.

## Evidence Requirements (What Harness Will Accept)

- For each of the 5 screens:
  - Figma file key + node-id (from PRD links).
  - One screenshot of the implemented screen.
  - A short delta note: "matched" or list of intentional deltas.
- For navigation:
  - A written smoke path with the exact route transitions and expected visible outcomes.
- For engineering:
  - `pnpm` checks list with pass/fail.
  - A statement confirming "no storage/schema/contracts touched" (validated by diff).

## Dev / Testor Constraints (Handoff)

### Constraints for Dev

- Do not add any storage contracts. No new DB tables/columns, no file-vault writes, no new persisted keys.
- Implement only view-state and navigation glue. File picking/parse results must be mocked.
- If you need to add routes for Upload/Parse, record final paths in `apps/mobile/README.md` and keep route naming consistent.
- Use Figma MCP if available to pull node specs; otherwise document "best-effort" with screenshots + manual measurements.
- Avoid global token refactors. If Figma requires token changes that could regress `login_and_tab`, request a Harness ruling first.

### Constraints for Testor

- Treat this as UI-only: validate rendering, navigation, states, and regressions against login + tabs.
- Provide at minimum one automated test that is stable (copy/model test, route existence test, or component render test).
- Smoke checklist must include the full path Ledger -> Upload -> Parse -> back, plus a quick regression on login and tab switching.

## Progress Table (Initial)

| Item | Status | Evidence | Blockers | Notes |
|---|---|---|---|---|
| A1 Login Figma alignment | 进行中 | None yet | Needs screenshots + node comparison | Screen exists; parity unproven |
| A2 Home Figma alignment | 进行中 | None yet | Needs screenshots + node comparison | Screen exists; parity unproven |
| A3 Ledger Figma alignment | 进行中 | None yet | Needs screenshots + node comparison | Screen exists; needs redesign per Figma |
| A4 Upload screen | 未开始 | None | Missing route + UI | Requires new screen/route |
| A5 Parse screen | 未开始 | None | Missing route + UI | Requires new screen/route |
| A6 Navigation complete | 未开始 | None | Depends on A4/A5 | Must be clickable end-to-end |
| A7 No contract changes | 待验收 | `pnpm contract:check` | Potential accidental persistence | Must remain untouched |
| A8 Automated test/smoke | 未开始 | None | Missing evidence | Prefer automated test |
| A9 Route/Figma mapping doc | 未开始 | None | Missing doc | `apps/mobile/README.md` recommended |
| A10 Required checks | 未开始 | None | Must pass before final review | Root commands required |

已通过条数 / 总条数：0 / 10

当前唯一主阻塞：尚未产出任何 Figma 对照证据，且 Upload/Parse 子流程路由与 UI 未实现。

距离可交付的最低条件：

1. 5 屏 UI 均实现并提供 Figma node 对照证据。
2. Ledger -> Upload -> Parse 导航可走通。
3. 至少 1 个自动化测试 + 全量 `pnpm` 门禁通过。
4. `apps/mobile/README.md`（或等价位置）记录路由与 node-id 映射。
