---
name: create-expo-stack-cli
description: >-
  Create Expo Stack (rn-new): interactive CLI for configurable Expo + React Native
  apps (TypeScript, Expo Router vs React Navigation, NativeWind/Unistyles/Tamagui,
  Supabase/Firebase). Use when choosing or reproducing CES templates and CLI flags.
---

# Create Expo Stack (CES)

Upstream: [roninoss/create-expo-stack](https://github.com/roninoss/create-expo-stack) — CLI published as **`rn-new`** (also referenced as Create Expo Stack / CES).

## Usage

```bash
npx rn-new@latest
```

Common flags (see repo README for full list):

- `--default` — accept defaults without prompts
- `--noInstall` / `--noGit` — skip install or git init
- `--npm`, `--yarn`, `--pnpm`, `--bun` — force package manager

## What the CLI configures

Per [README](https://github.com/roninoss/create-expo-stack/blob/main/README.md): TypeScript; **Expo Router** (file-based) or **React Navigation** (config-based); styling via **NativeWind**, Unistyles, StyleSheets, Restyle, or Tamagui; optional **Supabase** or **Firebase**; shared baseline versions across templates (Expo SDK, React Native, React — check the repo **Tech Stack** table for current pins).

## Practices

1. **Template fidelity** — Generated projects mix base + optional package templates (EJS); extend in the same structure the CLI produces when adding features.
2. **Version table** — Before advising dependency bumps, confirm against the upstream README matrix; CES keeps versions aligned across templates.
3. **Issues / FR** — Feature requests are often labeled `[FR]` in the repo issues.

Site: [rn.new](https://rn.new) (marketing / entry point referenced by the project).
