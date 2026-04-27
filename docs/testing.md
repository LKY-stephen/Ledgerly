# Testing Strategy

## Automated Checks

- Mobile and shared-package unit tests: `pnpm test`
- Mobile lint and type checks: `pnpm lint`, `pnpm typecheck`
- Contract consistency: `pnpm contract:check`
- Build validation: `pnpm build`

## Smoke Path

1. Start the Expo app and confirm the dashboard renders and the local bootstrap succeeds without requiring a backend.
2. Verify the local storage runtime reports SQLite and file-vault readiness.
3. Configure the supported AI-provider path through environment variables only, then validate one parse/planner flow and one assistant flow against that env-backed configuration.
4. When validating Infer, confirm the documented consumer split:
   - assistant can resolve Infer from the Infer key path
   - parse/planner only resolves Infer when both the Infer key and Infer base URL are present
5. Confirm the updated architecture and contract docs describe the same supported AI-provider story: env-backed middleware, assistant and parse/planner as separate consumers, and no public alternate auth-based setup path.

## Coverage Expectations

- Every storage contract change should have at least one success-path test and one invariant assertion.
- Shared package changes should be covered by lightweight unit tests before UI integration grows.
- Contract updates must land together with the mobile implementation or an explicit follow-up note in the PRD review.
- Documentation-only architecture updates should still leave a traceable smoke path that a reviewer can follow without guessing the supported AI-provider setup.
