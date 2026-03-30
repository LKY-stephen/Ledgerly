# Creator CFO Monorepo

Creator CFO 当前是一个 `Expo + React Native` 的移动端优先 monorepo，用来承载创作者的本地财务控制台。这个阶段没有后端，所有可观察行为都以设备本地为准：结构化数据走 SQLite，资料文件走本地 file vault，主题 / 语言 / 登录态走 AsyncStorage 契约。

## Current Slice

- 登录入口：Apple ID 一键登录展示、右上角「暂不登录」、游客模式
- 主壳层：四个底部 Tab，分别是首页、记账、发现、我的
- 设置能力：明暗主题切换、多语言切换、退出登录
- 本地契约：SQLite 表、文件仓集合、设备偏好与会话 key 已文档化并带自动化测试

## Stack

- App: Expo + React Native + Expo Router + TypeScript
- Local persistence: Expo SQLite + Expo File System + AsyncStorage
- Shared packages: `@creator-cfo/ui`, `@creator-cfo/storage`, `@creator-cfo/schemas`
- Contract source: `packages/storage/src/contracts.ts`, `docs/contracts/local-storage.md`
- Workflow source: `AGENTS.md`, `.cursor/context/main.md`（当前快照）, `.cursor/context/*_context.md`（按版本归档）, `.cursor/rules/work_flow.md`

## Quick Start

```bash
pnpm install
pnpm --filter @creator-cfo/mobile start
pnpm --filter @creator-cfo/mobile ios
pnpm --filter @creator-cfo/mobile android
pnpm --filter @creator-cfo/mobile web
```

Apple 登录只会在支持的 iOS 设备上触发真实授权；Web 与其他环境会优雅降级到游客流程。

## Required Checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm contract:check
pnpm smoke
```

`pnpm smoke` 会先执行 `build`，再执行各工作区的 smoke 任务。设备 / 模拟器上的手工冒烟清单见 [tests/smoke/README.md](/Users/peanut-tomo/Desktop/Tomo-project/creator_cfo_monorepo/tests/smoke/README.md)。

## Directory Guide

- `apps/mobile/app`: Expo Router 路由，含登录入口与四 Tab 壳层
- `apps/mobile/src/features`: 登录、首页、记账、发现、我的，以及 app-shell 状态管理
- `apps/mobile/src/storage`: 本地 SQLite 与 file-vault bootstrap
- `packages/storage`: 本地契约真源与契约测试
- `packages/ui`: 共享主题 token 与展示组件
- `packages/schemas`: 创作者领域模块、平台与工作流常量
- `docs/contracts`: 本地存储与设备偏好契约说明
- `.cursor/harness`: 按 workflow 留存的 Harness / Testor / Dev 记录
```

## Run The Database Hooks Demo

The interactive demo is part of the mobile app home screen.

1. Install dependencies with `pnpm install`.
2. Start a native build with one of:
   `pnpm --filter @creator-cfo/mobile ios`
   `pnpm --filter @creator-cfo/mobile android`
   `pnpm --filter @creator-cfo/mobile start`
3. Open the home screen and scroll to the `CRUD records through hooks` section.
4. Use the buttons in this order if you want to see the full flow:
   `Create record` adds another deterministic demo `records` row each time you press it.
   Tap any demo record in the list to make it the selected record.
   Use the `Description` or `Status` chips to choose which field the update action will mutate.
   `Update selected field` changes only that field on the selected row using real `UPDATE` SQL.
   `Delete selected record` removes the currently selected row.
   `Refresh` rereads the current demo rows plus the selected record's `record_double_entry_lines_v` rows.

Notes:
The live CRUD flow is native-focused because it uses `SQLiteProvider` and `useSQLiteContext` against the local Expo SQLite database.
`pnpm --filter @creator-cfo/mobile web` still shows the demo section, but as an explanatory fallback rather than a live SQLite interaction surface.

## Directory Layout

```text
.
|-- AGENTS.md
|-- CLAUDE.md
|-- README.md
|-- apps
|   `-- mobile
|       |-- app
|       |   |-- _layout.tsx
|       |   `-- index.tsx
|       |-- src
|       |   |-- features/home
|       |   |   |-- home-screen.tsx
|       |   |   `-- sections.ts
|       |   `-- storage
|       |       |-- bootstrap.ts
|       |       `-- status.ts
|       `-- tests
|           `-- sections.test.ts
|-- docs
|   |-- adr/0001-monorepo-foundation.md
|   |-- architecture.md
|   |-- contracts
|   |   `-- README.md
|   |-- development.md
|   `-- testing.md
|-- packages
|   |-- schemas
|   |   |-- package.json
|   |   |-- README.md
|   |   `-- src/index.ts
|   |-- storage
|   |   |-- package.json
|   |   |-- README.md
|   |   |-- src
|   |   |   |-- contracts.ts
|   |   |   `-- index.ts
|   |   `-- tests
|   |       `-- contracts.test.ts
|   `-- ui
|       |-- package.json
|       |-- README.md
|       `-- src
|           |-- index.ts
|           |-- section-card.tsx
|           |-- stat-pill.tsx
|           `-- tokens.ts
|-- tests
|   |-- README.md
|   `-- smoke/README.md
|-- .github/workflows/ci.yml
|-- .pre-commit-config.yaml
|-- eslint.config.mjs
|-- package.json
|-- pnpm-workspace.yaml
|-- tsconfig.base.json
`-- turbo.json
```

## Working Agreements

- 这是移动端优先、本地优先阶段，不引入后端或云同步，除非后续 PRD 明确重开范围。
- 存储相关变更必须先更新 `packages/storage` 与 `docs/contracts/`，再接功能。
- 新 domain flow 至少包含一个自动化测试和一次 smoke 更新。
- `apps/*` 只依赖 `packages/*`，不跨 app 直接引用。

## Local Data Direction

- SQLite：收入快照、发票、支出、税务预测、现金流快照
- File vault：票据、发票导出、平台对账单、税务辅助材料
- AsyncStorage：主题偏好、语言偏好、本地会话摘要

## Implemented In This PRD

- 带登录门禁的 Expo Router 壳层，支持冷启动路由到登录页或已登录 Tab
- 首页、记账、发现、我的四个主导航页面
- 明暗主题 token 与中英双语文案体系
- Apple 登录本地会话摘要与游客模式
- 更新后的契约文档、测试与 smoke 指引
- Structured database: `expo-sqlite` stores records-first creator finance data with supporting entities, accounts, counterparties, evidence metadata, and derived accounting views.
- File vault: `expo-file-system` stores canonical evidence objects, manifests, derived previews, invoice exports, and tax-support bundles directly on device.
- Contracts: storage tables, views, migration SQL, helper APIs, and vault directory rules are versioned inside the repo and covered by tests.

## What Is Implemented In This Adjustment

- An Expo Router mobile shell with a dashboard that reflects the product direction.
- A local storage bootstrap path that provisions SQLite tables and document-vault directories on device.
- Shared schema, UI, and storage packages aligned to a mobile-first monorepo.
- Updated CI, pre-commit hooks, contract docs, and context tracking for the RN baseline.
