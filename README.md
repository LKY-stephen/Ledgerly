# Ledgerly Monorepo

A local-first financial console for creators, built with Expo + React Native. No backend — all data lives on-device via SQLite and a local file vault.

## Tech Stack

- **App**: Expo 55 · React Native 0.83 · Expo Router · TypeScript
- **Storage**: expo-sqlite (native) / sql.js WASM (web) · Expo File System · AsyncStorage
- **Monorepo**: pnpm workspaces · Turborepo
- **API**: Direct OpenAI from the client by default, plus Vercel serverless compatibility routes under `api/`
- **Testing**: Vitest
- **Linting**: ESLint · Prettier

## Quick Start

```bash
# install dependencies (pnpm only — do not use npm)
pnpm install

# start dev server
pnpm dev

# run on a specific platform
pnpm --filter @ledgerly/mobile ios
pnpm --filter @ledgerly/mobile android
pnpm --filter @ledgerly/mobile web
```

## Scripts

| Command | Description |
|---------|-------------|
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
│   └── mobile/                  # Expo + React Native app
│       ├── app/                 # Expo Router routes
│       │   ├── (tabs)/          #   Bottom tab navigation
│       │   │   ├── index.tsx    #     Home
│       │   │   ├── ledger.tsx   #     Ledger
│       │   │   ├── discover.tsx #     Discover
│       │   │   └── profile.tsx  #     Profile
│       │   ├── ledger/          #   Ledger sub-routes
│       │   │   ├── upload.tsx   #     File upload
│       │   │   └── parse.tsx    #     CSV parsing
│       │   ├── journal.tsx      #   Journal see-all page
│       │   ├── login.tsx        #   Login screen
│       │   └── _layout.tsx      #   Root layout
│       ├── src/
│       │   ├── features/
│       │   │   ├── app-shell/   # App init, theme, locale, provider
│       │   │   ├── auth/        # Google login (native + web)
│       │   │   ├── home/        # Dashboard, trend chart, journal
│       │   │   ├── ledger/      # Ledger, GL, reporting, upload
│       │   │   ├── profile/     # Profile & settings
│       │   │   ├── discover/    # News feed
│       │   │   ├── navigation/  # Tab bar config
│       │   │   ├── database-demo/  # Demo data seeding
│       │   │   ├── form-1040/      # IRS Form 1040
│       │   │   ├── form-1099-nec/  # IRS Form 1099-NEC
│       │   │   ├── form-schedule-c/  # Schedule C
│       │   │   ├── form-schedule-se/ # Schedule SE
│       │   │   ├── tax-form-common/  # Shared tax utilities
│       │   │   └── storage-setup/    # Storage init screen
│       │   ├── storage/         # Database & file vault layer
│       │   │   ├── *.native.ts  #   Native implementations
│       │   │   └── *.web.ts     #   Web implementations
│       │   ├── components/      # Shared UI components
│       │   └── hooks/           # Shared hooks
│       └── tests/               # Vitest test files
│
├── packages/
│   ├── storage/                 # Storage contracts & DB helpers
│   │   └── src/
│   │       ├── contracts.ts     #   Schema, pragmas, migrations
│   │       ├── database.ts      #   DB abstraction layer
│   │       ├── record-entry.ts  #   Record entry model
│   │       └── tax-*.ts         #   Tax query & calculation
│   ├── schemas/                 # Domain types & constants
│   └── ui/                      # Shared UI tokens & components
│
├── api/                         # Vercel serverless functions
├── docs/                        # Architecture & contract docs
├── scripts/                     # Build & utility scripts
├── turbo.json                   # Turborepo pipeline config
├── pnpm-workspace.yaml          # Workspace definition
└── tsconfig.base.json           # Shared TS config
```

## Platform-Specific Files

The codebase uses Expo's platform extension convention:

- `*.native.ts` — runs on iOS / Android
- `*.web.ts` — runs in the browser (sql.js WASM + IndexedDB)
- `*.ts` — fallback / shared logic

## Mobile App Scripts

```bash
cd apps/mobile

pnpm start          # Start Expo dev server
pnpm ios            # Run on iOS simulator
pnpm android        # Run on Android emulator
pnpm web            # Start web with CORS proxy
pnpm test           # Run tests
pnpm typecheck      # Type check
pnpm lint           # Lint
pnpm build          # Export for web deployment
```

## Vercel Deploy

Vercel deployment is wired through [vercel.json](/Users/stephen/work/CFO/Ledgerly/vercel.json).

- The web build targets `@ledgerly/mobile` and outputs to `apps/mobile/dist`.
- The deployed app keeps the `api/` routes available for health checks and compatibility endpoints.
- Default OpenAI parsing still points to `https://api.openai.com/v1`; Vercel is the hosting target, not the required default parse proxy.

Typical deploy flow:

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
vercel
```

Optional runtime env overrides for the deployed web build:

- `EXPO_PUBLIC_OPENAI_BASE_URL`
- `EXPO_PUBLIC_OPENAI_MODEL`
- `EXPO_PUBLIC_GEMINI_BASE_URL`
- `EXPO_PUBLIC_GEMINI_MODEL`
- `EXPO_PUBLIC_INFER_BASE_URL`
- `EXPO_PUBLIC_INFER_MODEL`
