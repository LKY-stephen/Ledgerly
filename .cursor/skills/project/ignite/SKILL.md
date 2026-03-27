---
name: ignite-react-native-boilerplate
description: >-
  Infinite Red Ignite: battle-tested React Native / Expo boilerplate, CLI, generators,
  and stack defaults (React Navigation, MMKV, apisauce, Jest, Maestro). Use when
  scaffolding Ignite apps, matching Ignite conventions, or debugging Ignite CLI output.
---

# Ignite (Infinite Red)

Upstream: [infinitered/ignite](https://github.com/infinitered/ignite) — CLI (`ignite-cli`), boilerplate, component/model generators, and team defaults.

## Documentation

- **Full docs**: [Ignite](https://infinite.red/ignite) and linked guides from the repo README.
- **Cookbook**: [Ignite Cookbook](https://ignitecookbook.com/) for snippets (accessibility, CI/CD, etc.).

## Quick start (CLI)

```bash
npx ignite-cli@latest new YourApp
# non-interactive defaults:
npx ignite-cli@latest new YourApp --yes
```

Use `npx ignite-cli` rather than a global install; see repo [Troubleshooting](https://github.com/infinitered/ignite/blob/master/README.md) for Node, Xcode, and `--debug` tips.

## Stack orientation (typical generated app)

Ignite pins proven versions of React Native, React, TypeScript, **Expo SDK** (optional modules), **React Navigation**, **Reanimated**, **MMKV**, **apisauce** (REST), Jest, and optional Maestro E2E — see the repo README **Tech Stack** table for current versions.

## Practices

1. **Prefer generators** — Use Ignite’s generators for screens/models/components to stay consistent with the boilerplate.
2. **Read upstream first** — Boilerplate decisions (navigation, state, testing) are documented; avoid fighting the template without a reason.
3. **Licensing** — Generated app code is yours; Ignite branding is separate — see [License and Trademark](https://github.com/infinitered/ignite/blob/master/README.md) in the README.
