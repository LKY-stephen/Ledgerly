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
- **Routing**: Expo Router (file-based, Stack navigator)
- **Database**: expo-sqlite (native) / sql.js (web)
- **Preferences**: AsyncStorage
- **Testing**: Vitest

### Route Structure

```
app/
├── _layout.tsx              # Root layout — AppShellProvider, StatusBar, WebLayoutContainer
├── index.tsx                # Entry point — resolves to login / storage-setup / (game)
├── login.tsx                # Authentication (Apple Sign-In, Guest)
├── storage-setup.tsx        # Database initialization / import
├── profile.tsx              # Profile & settings
├── journal.tsx              # Journal see-all page
├── (game)/
│   ├── _layout.tsx          # GameProvider wrapper + Stack navigator
│   └── index.tsx            # Main game screen (card-dock)
├── ledger/
│   ├── _layout.tsx          # Modal stack for ledger flows
│   ├── upload.tsx           # Receipt upload
│   ├── parse.tsx            # Receipt parsing review
│   └── journals.tsx         # Journal entries
└── news/
    └── [slug].tsx           # Dynamic news article
```

App entry flow: `index.tsx` checks hydration, session, and storage gate → redirects to `/login`, `/storage-setup`, or `/(game)` accordingly.

### Feature Modules (`src/features/`)

| Module | Purpose |
|---|---|
| `app-shell/` | Global state: theme, locale, auth session, profile info, storage gate, web layout container |
| `game/` | Card-dock game: game context, panels, animations, stickman, center panel (native/web) |
| `home/` | Dashboard: balance overview, trend chart, recent activity, AI chat panel |
| `ledger/` | Core ledger: receipt upload, AI parsing, planner workflow, GL reporting |
| `agent/` | AI chat: AgentProvider, AgentChat UI, useAgent hook |
| `profile/` | Settings: theme, locale, profile info, database import/export |
| `discover/` | News feed with financial content |
| `auth/` | Apple Sign-In and session flows |
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
- Auth flows: native auth integrations vs web session handling
- File access: expo-file-system (native) vs Blob/File API (web)
- Game center panel: native vs web rendering

### Storage Layer

| Mechanism | Purpose | Interface |
|---|---|---|
| SQLite | Structured data (entities, records, counterparties, evidence, tax) | `WritableStorageDatabase` |
| File Vault | Receipt images, documents | Platform-specific file APIs |
| AsyncStorage | User preferences, auth session, profile info, and internal compatibility state | Key-value strings |

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
  → AgentSession registers Ledgerly CRUD, workflow inspection, and tax drill-down tools
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
- **Storage**: storage overview, bootstrap metadata, package helper paths
- **Workflow/Evidence**: evidence, upload batches, extraction/planner runs, candidate records, write proposals, audit events
- **Metrics**: monthly income/expense/net, daily trend, date-range search
- **Tax Drill-down**: Schedule C candidates/aggregation, Schedule SE preview, tax-helper evidence links
- **Context**: snapshot for AI system prompt (entity, totals, recent records)

### Agent Layer (`@ledgerly/agent`)

`AgentSession` manages conversations with tool calling:
- **Tool groups**: record CRUD, reporting, tax summary, storage overview, evidence/workflow inspection, and lower-level tax drill-down
- **Providers**: OpenAI, Infer, Gemini
- **Session**: Message history, context refresh, subscriber pattern, abort support
- **Bilingual**: System prompt in English or zh-CN based on locale

### Chat UI (`apps/mobile/src/features/agent/`)

- `AgentChat`: Message bubbles, tool call indicators, input with send button
- `AgentProvider`: Wires SDK + assistant middleware resolution into React context
- `useAgent`: Manages AgentSession lifecycle, message state, error handling
- `useWritableDatabase.{native,web}`: Platform-specific database access

---

## AI Provider Middleware

Ledgerly currently documents AI configuration as one env-backed `ai_provider` middleware concept with multiple consumers.

Supported/current configuration comes from environment variables:

| Provider | Required Env | Optional Env |
|---|---|---|
| OpenAI | `EXPO_PUBLIC_OPENAI_API_KEY` | `EXPO_PUBLIC_OPENAI_BASE_URL`, `EXPO_PUBLIC_OPENAI_MODEL` |
| Infer | `EXPO_PUBLIC_INFER_API_KEY` | `EXPO_PUBLIC_INFER_BASE_URL`, `EXPO_PUBLIC_INFER_MODEL` |
| Gemini | `EXPO_PUBLIC_GEMINI_API_KEY` | `EXPO_PUBLIC_GEMINI_BASE_URL`, `EXPO_PUBLIC_GEMINI_MODEL` |

Default endpoints/models:

- OpenAI base URL defaults to `https://api.openai.com/v1`
- OpenAI model defaults to `gpt-4o`
- Infer base URL defaults to `https://api.infer.ai/v1`
- Infer model defaults to `gpt-4o`
- Gemini base URL defaults to `https://generativelanguage.googleapis.com/v1beta`
- Gemini model defaults to `gemini-2.5-flash`

Current/public architecture docs intentionally describe the env-backed path only. Older settings-driven or persisted device-state fields still exist in the codebase as implementation detail and compatibility residue, but they are not the supported/current AI-provider contract described here.

### Consumer Priority Summary

| Consumer | 1st Priority | 2nd Priority | 3rd Priority |
|---|---|---|---|
| Assistant chat | OpenAI when `EXPO_PUBLIC_OPENAI_API_KEY` is present | Infer when an Infer API key is available | Gemini when `EXPO_PUBLIC_GEMINI_API_KEY` is present |
| Parse + planner | OpenAI when `EXPO_PUBLIC_OPENAI_API_KEY` is present | Infer only when both `EXPO_PUBLIC_INFER_API_KEY` and `EXPO_PUBLIC_INFER_BASE_URL` are present | Gemini when `EXPO_PUBLIC_GEMINI_API_KEY` is present |

The key difference is that the assistant can resolve Infer from the Infer key path, while parse/planner only treats Infer as complete when both the key and base URL are present.

### Assistant Consumer

The home assistant consumes the middleware through `@ledgerly/agent` and uses chat-completions style requests:

- OpenAI: `/chat/completions`
- Infer: `/chat/completions`
- Gemini: `/openai/chat/completions`

Assistant activation is API-key-driven in the current/public contract:

- OpenAI assistant path activates when `EXPO_PUBLIC_OPENAI_API_KEY` is present
- Infer assistant path activates when the assistant resolves to the Infer key path; `EXPO_PUBLIC_INFER_BASE_URL` and `EXPO_PUBLIC_INFER_MODEL` are optional overrides rather than activation requirements in the published contract
- Gemini assistant path activates from `EXPO_PUBLIC_GEMINI_API_KEY`

Practical assistant implications:

- assistant and parse/planner do not have to use the same provider/model path at runtime
- assistant Infer usage is decided by the assistant's middleware resolution path, not by a persisted settings toggle
- assistant docs currently expose API-key configuration only

### Parse And Planner Consumer

Receipt parsing and planner prompting consume the same env-backed middleware, but they apply parse-specific completeness and request rules:

- OpenAI and Infer use Responses-style calls
- Gemini uses native `generateContent`
- Infer parse/planner path requires both an Infer API key and an Infer base URL to be considered complete
- Parse/planner model selection can apply provider-specific fallback behavior that differs from assistant chat

Practical parse/planner implications:

- OpenAI remains the default direct path when OpenAI env configuration is present
- Infer is used only when the parse/planner middleware path resolves to a complete Infer configuration
- Gemini remains an env-key-based parse option in the current/public docs
- hidden/future auth-based paths are intentionally omitted from the current/public architecture story

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
- **TypeScript**: 5.8+ (strict mode, `moduleResolution: Bundler`)
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
