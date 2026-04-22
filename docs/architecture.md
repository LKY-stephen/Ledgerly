# Architecture Overview

## Product Direction

The repository is prepared for a creator finance platform that will unify income aggregation, invoicing, cost tracking, tax estimation, cash-flow visibility, and stablecoin settlement workflows.

## Top-Level Design

- `apps/mobile`: Expo Router entry point for the React Native application.
- `packages/ui`: Shared presentation primitives for React Native screens.
- `packages/schemas`: Shared creator-finance domain constants and lightweight TS types.
- `packages/storage`: Local database and document-vault contracts used by the mobile app.
- `packages/sdk`: High-level CRUD SDK wrapping storage operations for external consumers and the AI agent.
- `packages/agent`: AI agent session, tool definitions, and skill executors for conversational ledger management.
- `tests`: Cross-app smoke guidance and future end-to-end suites.
- `docs`: ADRs, contracts, engineering rules, and test strategy.

## Boundary Rules

- There is no backend in this phase. Core product data lives in on-device SQLite tables plus document-vault directories.
- `apps/mobile` consumes shared packages only.
- Shared packages cannot depend on app-specific implementation code.
- Cross-cutting quality rules live at the repo root so agents and CI evaluate the same truth.

## Expansion Plan

1. Add richer finance entities and local migration steps in `packages/storage`.
2. Introduce sync adapters only after the product needs remote collaboration or backup.
3. Expand smoke or end-to-end automation under `tests/` as soon as authenticated flows are available.

## Agent Architecture

The conversational agent follows this flow:

```
Homepage loads
  → Initialize local database / file handles / local SDK
  → Restore Agent Session
  → Register callable CRUD tools
  → Give AI a context snapshot of the current ledger state
  → AI processes user messages and calls local SDK via tools
  → SDK modifies local data, agent returns response
```

### SDK Layer (`@ledgerly/sdk`)

The `LedgerlySDK` class wraps `@ledgerly/storage` with high-level operations:
- **Records**: list, get, create, update, delete
- **Entities**: list, get, ensure default
- **Counterparties**: list, get, create
- **Metrics**: monthly metrics, daily trend
- **Context**: snapshot for AI system prompt

### Agent Layer (`@ledgerly/agent`)

The `AgentSession` manages conversations with tool calling:
- **Tools**: 10 registered CRUD tools (list_records, create_record, get_monthly_metrics, etc.)
- **Providers**: OpenAI, Gemini, and custom Infer models via OpenAI-compatible API
- **Skills**: Each tool is a skill the AI can invoke to manage ledger data
- **Session**: Message history, context refresh, abort support

### Chat UI (`apps/mobile/src/features/agent/`)

- `AgentChat` component with message bubbles, tool call indicators
- `AgentProvider` wires SDK + config into React context
- Platform-specific database hooks (native SQLite / web sql.js)
