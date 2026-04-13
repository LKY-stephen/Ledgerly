# Development Standards

## Coding Standards

- TypeScript uses strict mode, named exports, and workspace-level path aliases.
- React Native screens stay thin; persistence and domain rules belong in shared packages or storage services.
- Shared storage contracts are updated before feature integration work.
- Native storage calls should be isolated behind app-level services so contracts stay testable.

## Review Rules

- Architecture, state, and storage migration changes require explicit contract notes.
- Large tasks should be split into verifiable sub-steps with lint, test, build, and contract checks.
- No app-to-app imports. Shared logic belongs in `packages/`, not inside screen files.

## Tooling

- `pnpm` manages all JavaScript and TypeScript packages.
- This repository is pnpm-only. Do not run `npm install`, because npm does not read `pnpm-workspace.yaml` and can leave workspace apps partially installed.
- If someone already ran npm, recover with `rm -rf node_modules package-lock.json && pnpm install` from the repo root.
- `pnpm --filter @creator-cfo/mobile ios` now repairs known ExpoModulesCore CocoaPods drift before handing off to Expo, including missing protocol headers under `expo-modules-core/ios/Protocols`, stale dangling public-header imports from older pod layouts, and stale `Pods.xcodeproj` source entries such as a missing `AppContextFactory.swift` or obsolete `RCTComponentData+Privates.{h,m}` references.
- If iOS native builds start referencing missing Expo source files such as `expo-modules-core/ios/Core/Views/ComponentData.swift`, the CocoaPods project is stale relative to `node_modules`. Regenerate pods from `apps/mobile/ios` with `pod install` when network access to the CocoaPods CDN is available.
- `pnpm --filter @creator-cfo/mobile ios` now starts at Metro port `8088` and automatically advances until it finds an available port, instead of stopping on Expo's interactive port prompt. Set `RCT_METRO_PORT` when you need a specific port. If it still fails before launch, check `xcrun simctl list devices`: Expo cannot continue until CoreSimulatorService and Simulator.app are healthy on the host machine.
- Expo is the mobile framework baseline for this phase.
- `pre-commit` and GitHub Actions mirror the same quality gates.
