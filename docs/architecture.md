# Architecture Overview

## Product Direction

Ledgerly is a creator finance platform unifying income aggregation, cost tracking, tax estimation, cash-flow visibility, and AI-powered ledger management. The current phase is **local-first with no backend** — all product data lives on-device.

---

## Monorepo Structure

```
Ledgerly/
├── apps/
│   └── mobile/              # Expo 55 + React Native 0.83 (iOS / Android / Web)
├── packages/
│   ├── schemas/             # Domain types, state machines, product constants
│   ├── storage/             # SQLite contracts, migrations, tax queries
│   ├── sdk/                 # High-level CRUD SDK wrapping storage
│   ├── agent/               # AI agent session, tool definitions, skill executors
│   └── ui/                  # Shared React Native presentation primitives
├── api/                     # Vercel serverless functions (receipt parsing, CORS proxy)
├── docs/                    # ADRs, contracts, engineering rules
├── tests/                   # Smoke tests and e2e fixtures
└── scripts/                 # Build and utility scripts
```

### Package Dependency Graph

```
@ledgerly/schemas          (no internal deps)
       │
@ledgerly/storage          depends on → schemas
       │
@ledgerly/sdk              depends on → schemas, storage
       │
@ledgerly/agent            depends on → schemas, sdk
       │
@ledgerly/ui               (no internal deps, peer: react-native)
```

All packages are private (not published), use TypeScript strict mode, and are consumed via pnpm workspace aliases.

---

## Mobile App (`apps/mobile/`)

### Tech Stack

- **Framework**: React 19 + React Native 0.83 + Expo 55
- **Routing**: Expo Router (file-based)
- **Database**: expo-sqlite (native) / sql.js (web)
- **Preferences**: AsyncStorage
- **Testing**: Vitest

### Route Structure

```
app/
├── _layout.tsx              # Root layout — AppShellProvider, StatusBar
├── index.tsx                # Entry point — resolves initial route
├── login.tsx                # Authentication (Apple, Google, Guest)
├── storage-setup.tsx        # Database initialization / import
├── (tabs)/
│   ├── _layout.tsx          # Tab bar + desktop sidebar (>768px)
│   ├── index.tsx            # Home tab
│   ├── ledger.tsx           # Ledger tab
│   ├── discover.tsx         # News feed tab
│   └── profile.tsx          # Settings tab
└── ledger/
    ├── _layout.tsx          # Modal stack for ledger flows
    ├── upload.tsx            # Receipt upload
    └── parse.tsx             # Receipt parsing review
```

### Feature Modules (`src/features/`)

| Module | Purpose |
|---|---|
| `app-shell/` | Global state: theme, locale, auth session, AI config, storage gate |
| `home/` | Dashboard: balance overview, trend chart, recent activity, AI chat panel |
| `ledger/` | Core ledger: receipt upload, AI parsing, planner workflow, GL reporting |
| `agent/` | AI chat: AgentProvider, AgentChat UI, useAgent hook |
| `profile/` | Settings: AI provider, API keys, theme, locale, database import/export |
| `discover/` | News feed with financial content |
| `auth/` | Apple Sign-In, Google OAuth |
| `navigation/` | Tab bar config, desktop sidebar |
| `storage-setup/` | Database onboarding flow |
| `database-demo/` | Demo data seeding |
| `form-1040/` | Form 1040 rendering |
| `form-1099-nec/` | Form 1099-NEC rendering |
| `form-schedule-c/` | Schedule C rendering |
| `form-schedule-se/` | Schedule SE rendering |
| `tax-form-common/` | Shared tax form canvas and preview components |

### Platform Branching

Files use `.native.ts` / `.web.ts` suffixes for platform-specific implementations:
- Database access: expo-sqlite (native) vs sql.js + IndexedDB (web)
- Auth flows: native Apple/Google SDK vs web OAuth redirects
- File access: expo-file-system (native) vs Blob/File API (web)

### Storage Layer

| Mechanism | Purpose | Interface |
|---|---|---|
| SQLite | Structured data (entities, records, counterparties, evidence, tax) | `WritableStorageDatabase` |
| File Vault | Receipt images, documents | Platform-specific file APIs |
| AsyncStorage | User preferences, auth session, AI config | Key-value strings |

Database initialization flow: `inspectStorageGateState()` → schema bootstrap → pragma setup (WAL, FK) → ready.

### Responsive Design

`useResponsive()` hook provides breakpoints:
- **Compact**: <600px (single column, bottom tabs)
- **Medium**: 600–1024px
- **Expanded**: >1024px (two-column layouts, desktop sidebar)

---

## Agent System

### Architecture Flow

```
Home screen loads
  → LocalStorageProvider initializes SQLite
  → AgentProvider creates LedgerlySDK + AgentSession
  → AgentSession registers 10 CRUD tools
  → System prompt includes current ledger context snapshot
  → User sends message via chat panel
  → AgentSession calls AI model (OpenAI-compatible API)
  → If tool calls: execute via SDK → loop back to model
  → Return assistant response → refresh home screen data
```

### SDK Layer (`@ledgerly/sdk`)

`LedgerlySDK` wraps `@ledgerly/storage` with high-level operations:
- **Records**: list, get, create, update, delete (with filter, pagination, search)
- **Entities**: list, get, ensure default
- **Counterparties**: list, get, create
- **Metrics**: monthly income/expense/net, daily trend
- **Context**: snapshot for AI system prompt (entity, totals, recent records)

### Agent Layer (`@ledgerly/agent`)

`AgentSession` manages conversations with tool calling:
- **10 Tools**: `list_records`, `get_record`, `create_record`, `update_record`, `delete_record`, `get_monthly_metrics`, `get_daily_trend`, `list_counterparties`, `create_counterparty`, `get_context_snapshot`
- **Providers**: OpenAI, Gemini, Infer (all via OpenAI-compatible Chat Completions API)
- **Session**: Message history, context refresh, subscriber pattern, abort support
- **Bilingual**: System prompt in English or zh-CN based on locale

### Chat UI (`apps/mobile/src/features/agent/`)

- `AgentChat`: Message bubbles, tool call indicators, input with send button
- `AgentProvider`: Wires SDK + AI config into React context
- `useAgent`: Manages AgentSession lifecycle, message state, error handling
- `useWritableDatabase.{native,web}`: Platform-specific database access

---

## AI Provider Configuration

All AI features (receipt parsing + agent chat) share the same configuration:

| Setting | Storage | Env Fallback |
|---|---|---|
| Provider selection | `@ledgerly/device_state/ai_provider` | — |
| OpenAI API Key | `@ledgerly/device_state/openai_api_key` | `EXPO_PUBLIC_OPENAI_API_KEY` |
| OpenAI Base URL | — | `EXPO_PUBLIC_OPENAI_BASE_URL` |
| OpenAI Model | — | `EXPO_PUBLIC_OPENAI_MODEL` |
| Gemini API Key | `@ledgerly/device_state/gemini_api_key` | `EXPO_PUBLIC_GEMINI_API_KEY` |
| Gemini Base URL | — | `EXPO_PUBLIC_GEMINI_BASE_URL` |
| Gemini Model | — | `EXPO_PUBLIC_GEMINI_MODEL` |
| Infer API Key | `@ledgerly/device_state/infer_api_key` | `EXPO_PUBLIC_INFER_API_KEY` |
| Infer Base URL | `@ledgerly/device_state/infer_base_url` | `EXPO_PUBLIC_INFER_BASE_URL` |
| Infer Model | `@ledgerly/device_state/infer_model` | `EXPO_PUBLIC_INFER_MODEL` |

Default models: OpenAI `gpt-4o`, Gemini `gemini-2.5-flash`, Infer `gpt-4o`.

Receipt parsing uses the OpenAI Responses API (`/responses`); agent chat uses Chat Completions API (`/chat/completions`).

---

## API Layer (`api/`)

Vercel serverless functions:

| Endpoint | Purpose | Timeout |
|---|---|---|
| `health.ts` | Health check | — |
| `parse-evidence.ts` | Parse receipt/evidence data | 60s |
| `parse-origin-data.ts` | Parse origin data payload | 60s |
| `map-evidence-scheme.ts` | Legacy scheme mapping | 60s |
| `cors-proxy.ts` | CORS proxy for third-party APIs | 30s |

Helper functions in `api/_lib/`: OpenAI integration, contract validation, request parsing.

---

## Build & Deployment

### Tooling

- **Package Manager**: pnpm 10.28.0 (workspaces)
- **Build Orchestration**: Turborepo
- **TypeScript**: 5.8, strict mode, `moduleResolution: Bundler`
- **Linting**: ESLint flat config + `consistent-type-imports`
- **Formatting**: Prettier (semi, double quotes, trailing commas)
- **Pre-commit**: trailing-whitespace, JSON/YAML checks, lint, typecheck, test, contract:check

### CI (GitHub Actions)

Single `verify` job on push/PR to main:
```
install → lint → typecheck → test → contract:check → build → smoke
```
Node 22, pnpm 10.28.0, ubuntu-latest, 30-min timeout.

### Deployment (Vercel)

- Build: `pnpm --filter @ledgerly/mobile run build` → export web SPA + copy WASM
- Output: `apps/mobile/dist`
- Rewrites: `/api/*` → serverless functions, fallback → SPA `index.html`

### Key Scripts

| Command | Scope |
|---|---|
| `pnpm dev` | Start all workspaces |
| `pnpm build` | Build everything |
| `pnpm test` | Run all tests |
| `pnpm lint` | Lint all |
| `pnpm typecheck` | Type check all |
| `pnpm contract:check` | Validate storage contracts |

Mobile-specific (run from `apps/mobile/`):
| Command | Action |
|---|---|
| `pnpm web` | Start web dev server (port 8088) + CORS proxy |
| `pnpm ios` | Run on iOS simulator |
| `pnpm android` | Run on Android |

---

## Boundary Rules

1. **No backend in this phase.** Core product data lives in on-device SQLite + file vault.
2. `apps/mobile` consumes shared packages only.
3. Shared packages cannot depend on app-specific code.
4. Every change to storage contracts must update tests and `docs/contracts/local-storage.md` in the same commit.
5. Cross-cutting quality rules live at the repo root so agents and CI evaluate the same truth.

## Key Architecture Principles

- **Local-first**: All data on-device; sync/cloud is a future phase.
- **Contract-driven**: `packages/storage/src/contracts.ts` and `docs/contracts/local-storage.md` are the canonical source for persistence.
- **Platform-agnostic packages**: Shared packages are pure TypeScript; platform bridging happens in `apps/mobile`.
- **Bilingual**: English and zh-CN are first-class throughout UI and AI prompts.
- **AI-first ledger management**: Conversational interface via tool calling is a core product feature, not an add-on.
- **Sparse evidence capture**: Evidence optimized for simple facts (date, amount, source, target, description).
- **Tax-first financial model**: Built around US Schedule C, Schedule SE, and Form 1040 requirements.
