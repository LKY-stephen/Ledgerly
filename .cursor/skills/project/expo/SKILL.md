---
name: expo-framework
description: >-
  Expo SDK, CLI, Router, and universal React Native (iOS, Android, web). Use when
  building or debugging Expo apps, native modules, EAS, or aligning with official
  Expo patterns; prefer docs.expo.dev over guessing APIs.
---

# Expo (official framework)

Upstream: [expo/expo](https://github.com/expo/expo) — open-source SDK, Modules API, Expo Go, CLI, Router, and docs source.

## Primary documentation

- **Docs (source of truth for APIs)**: [docs.expo.dev](https://docs.expo.dev)
- **Getting started**: follow [Get Started](https://docs.expo.dev/get-started/introduction/) for new apps and toolchain setup.

## Repository layout (when reading source)

| Path | Purpose |
|------|---------|
| `packages/` | Expo modules and library source |
| `apps/` | Internal Expo apps used for development |
| `apps/expo-go` | Expo Go client (open `Exponent.xcworkspace` on iOS, not the bare `.xcodeproj`) |
| `docs/` | Source for docs.expo.dev |
| `templates/` | Templates used by `create-expo-app` |

## Practices

1. **SDK alignment** — Match `expo` package version to the [SDK release](https://docs.expo.dev/versions/latest/) you target; avoid mixing incompatible `react-native` / Expo SDK pairs.
2. **EAS** — Builds, updates, and credentials flow through [Expo Application Services (EAS)](https://docs.expo.dev/eas/); keep `eas.json` and project config in sync with docs.
3. **Web + native** — Expo targets universal apps; verify platform-specific behavior in docs (e.g. web vs native APIs).

For product questions and community norms, see the repo [README](https://github.com/expo/expo/blob/main/README.md) and [Expo Community Guidelines](https://github.com/expo/expo/blob/main/README.md).
