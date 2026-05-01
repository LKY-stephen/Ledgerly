# Ledgerly Monorepo

A local-first financial console for creators, built with Expo + React Native. No backend — all data lives on-device via SQLite and a local file vault.

## Tech Stack

- **App**: Expo 55 · React Native 0.83 · React 19 · Expo Router · TypeScript 5.9
- **Storage**: expo-sqlite (native) / sql.js WASM (web) · Expo File System · AsyncStorage
- **Monorepo**: pnpm 10.28 workspaces · Turborepo
- **API**: Vercel serverless functions under `api/` (receipt parsing, CORS proxy)
- **AI**: OpenAI / Infer / Gemini — env-backed provider middleware, chat + parse/planner consumers
- **Testing**: Vitest
- **Linting**: ESLint (flat config) · Prettier
- **CI**: GitHub Actions · pre-commit hooks

## Quick Start

```bash
# install dependencies (pnpm only — do not use npm)
pnpm install

# start all workspaces in dev mode
pnpm dev

# run on a specific platform
pnpm --filter @ledgerly/mobile ios
pnpm --filter @ledgerly/mobile android
pnpm --filter @ledgerly/mobile web
```

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start all workspaces in dev mode |
| `pnpm build` | Build all packages and apps |
| `pnpm test` | Run all tests (API + workspaces) |
| `pnpm typecheck` | TypeScript type checking |
| `pnpm lint` | ESLint across all workspaces |
| `pnpm format` | Prettier format check |
| `pnpm contract:check` | Run storage contract tests |
| `pnpm smoke` | Build then run smoke tests |

## Project Structure

```
Ledgerly/
├── apps/
│   └── mobile/                    # Expo 55 + React Native 0.83 (iOS / Android / Web)
│       ├── app/                   # Expo Router file-based routes
│       │   ├── _layout.tsx        #   Root layout — AppShellProvider, StatusBar
│       │   ├── index.tsx          #   Entry — resolves to login / storage-setup / (game)
│       │   ├── login.tsx          #   Authentication (Apple Sign-In, Guest)
│       │   ├── storage-setup.tsx  #   Database initialization / import
│       │   ├── profile.tsx        #   Profile & settings
│       │   ├── journal.tsx        #   Journal see-all page
│       │   ├── (game)/            #   Main app route group (after login + storage ready)
│       │   │   ├── _layout.tsx    #     GameProvider wrapper
│       │   │   └── index.tsx      #     Game screen
│       │   ├── ledger/            #   Ledger sub-routes (modal stack)
│       │   │   ├── _layout.tsx    #     Modal stack layout
│       │   │   ├── upload.tsx     #     Receipt upload
│       │   │   ├── parse.tsx      #     Receipt parsing review
│       │   │   └── journals.tsx   #     Journal entries
│       │   └── news/
│       │       └── [slug].tsx     #   Dynamic news article
│       ├── src/
│       │   ├── features/          # Feature modules (see table below)
│       │   ├── storage/           # Database & file vault layer
│       │   │   ├── *.native.ts    #   Native implementations (expo-sqlite)
│       │   │   └── *.web.ts       #   Web implementations (sql.js + IndexedDB)
│       │   ├── components/        # Shared UI components
│       │   └── hooks/             # Shared hooks
│       └── tests/                 # Vitest test files
│
├── packages/
│   ├── schemas/                   # Domain types, state machines, product constants
│   ├── storage/                   # SQLite contracts, migrations, DB helpers, tax queries
│   ├── sdk/                       # High-level CRUD SDK wrapping storage
│   ├── agent/                     # AI agent session, tool definitions, skill executors
│   └── ui/                        # Shared React Native presentation primitives
│
├── api/                           # Vercel serverless functions
│   ├── health.ts                  #   Health check
│   ├── parse-evidence.ts          #   Parse receipt/evidence data
│   ├── parse-origin-data.ts       #   Parse origin data payload
│   ├── map-evidence-scheme.ts     #   Legacy scheme mapping (deprecated)
│   ├── cors-proxy.ts              #   CORS proxy for third-party APIs
│   └── _lib/                      #   Shared helpers
│
├── docs/                          # Technical documentation
│   ├── architecture.md            #   Architecture overview
│   ├── development.md             #   Development standards
│   ├── testing.md                 #   Testing strategy
│   ├── upload-planner-workflow.md #   Upload/parse/planner workflow
│   ├── sdk-formalization-plan.md  #   SDK surface roadmap
│   ├── gnucash-storage-capability-gaps.md
│   ├── tax-parsing-logic.md       #   Tax form parsing design
│   ├── adr/                       #   Architecture Decision Records
│   └── contracts/                 #   Local storage contract docs
│       ├── README.md
│       └── local-storage.md       #   Canonical local-storage contract
│
├── prd/                           # Product requirement documents
├── tests/                         # Cross-app smoke & integration tests
├── scripts/                       # Build & utility scripts
│
├── turbo.json                     # Turborepo pipeline config
├── pnpm-workspace.yaml            # Workspace definition
├── tsconfig.base.json             # Shared TS config
├── vercel.json                    # Vercel deployment config
└── eslint.config.mjs              # ESLint flat config
```

## Package Dependency Graph

```
@ledgerly/schemas          (no internal deps)
       │
@ledgerly/storage          → schemas
       │
@ledgerly/sdk              → schemas, storage
       │
@ledgerly/agent            → schemas, sdk
       │
@ledgerly/ui               (no internal deps; peer: react-native)
```

All packages are private, use TypeScript strict mode, and are consumed via `workspace:*` aliases.

## Feature Modules

Located in `apps/mobile/src/features/`:

| Module | Purpose |
|---|---|
| `app-shell/` | Global state: theme, locale, auth session, profile info, storage gate, web layout |
| `game/` | Card-dock game: game context, panels, animations, stickman |
| `home/` | Dashboard: balance overview, trend chart, recent activity, AI chat panel |
| `ledger/` | Core ledger: receipt upload, AI parsing, planner workflow, GL reporting |
| `agent/` | AI chat: AgentProvider, AgentChat UI, useAgent hook |
| `profile/` | Settings: theme, locale, profile info, database import/export |
| `discover/` | News feed with financial content |
| `auth/` | Apple Sign-In and session flows |
| `storage-setup/` | Database onboarding flow |
| `database-demo/` | Demo data seeding |
| `form-1040/` | IRS Form 1040 rendering |
| `form-1099-nec/` | IRS Form 1099-NEC rendering |
| `form-schedule-c/` | Schedule C rendering |
| `form-schedule-se/` | Schedule SE rendering |
| `tax-form-common/` | Shared tax form canvas and preview components |

## Platform-Specific Files

The codebase uses Expo's platform extension convention:

- `*.native.ts` — runs on iOS / Android (expo-sqlite, expo-file-system)
- `*.web.ts` — runs in the browser (sql.js WASM + IndexedDB, Blob/File API)
- `*.ts` — fallback / shared logic

## AI Provider Configuration

Ledgerly supports three AI providers, configured via environment variables:

| Provider | Required Env | Optional Env |
|---|---|---|
| OpenAI | `EXPO_PUBLIC_OPENAI_API_KEY` | `EXPO_PUBLIC_OPENAI_BASE_URL`, `EXPO_PUBLIC_OPENAI_MODEL` |
| Infer | `EXPO_PUBLIC_INFER_API_KEY` | `EXPO_PUBLIC_INFER_BASE_URL`, `EXPO_PUBLIC_INFER_MODEL` |
| Gemini | `EXPO_PUBLIC_GEMINI_API_KEY` | `EXPO_PUBLIC_GEMINI_BASE_URL`, `EXPO_PUBLIC_GEMINI_MODEL` |

Two consumers with different provider resolution:
- **Assistant chat**: activates from API key presence alone
- **Parse/planner**: Infer requires both API key and base URL to be considered complete

## Mobile App Scripts

```bash
cd apps/mobile

pnpm start          # Start Expo dev server
pnpm ios            # Run on iOS simulator
pnpm android        # Run on Android emulator
pnpm web            # Start web (port 8088) + CORS proxy
pnpm test           # Run tests
pnpm typecheck      # Type check
pnpm lint           # Lint
pnpm build          # Export for web deployment
```

## Vercel Deployment

Configured via [vercel.json](vercel.json):

- Build: `pnpm --filter @ledgerly/mobile run build` → export web SPA + copy WASM
- Output: `apps/mobile/dist`
- Rewrites: `/api/*` → serverless functions, fallback → SPA `index.html`
- The `api/` routes provide receipt parsing endpoints and a CORS proxy

Deploy flow:

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
vercel
```

## CI Pipeline

GitHub Actions runs a single `verify` job on push/PR to main:

```
install → lint → typecheck → test → contract:check → build → smoke
```

Node 22, pnpm 10.28.0, ubuntu-latest, 30-min timeout.

## Documentation

| Document | Description |
|---|---|
| [Architecture](docs/architecture.md) | Full architecture overview, package graph, agent system, build & deployment |
| [Development](docs/development.md) | Coding standards, review rules, tooling notes |
| [Testing](docs/testing.md) | Testing strategy, smoke path, coverage expectations |
| [Local Storage Contract](docs/contracts/local-storage.md) | Canonical persistence contract (SQLite tables, file vault, device state) |
| [Upload Planner Workflow](docs/upload-planner-workflow.md) | Receipt upload → parse → plan → approve flow |
| [SDK Formalization Plan](docs/sdk-formalization-plan.md) | SDK surface expansion roadmap |
| [Tax Parsing Logic](docs/tax-parsing-logic.md) | Form 1040 / Schedule C / SE parsing design |
| [GnuCash Capability Gaps](docs/gnucash-storage-capability-gaps.md) | Feature gap analysis vs GnuCash |
| [ADR 0001](docs/adr/0001-monorepo-foundation.md) | Monorepo foundation decision |
