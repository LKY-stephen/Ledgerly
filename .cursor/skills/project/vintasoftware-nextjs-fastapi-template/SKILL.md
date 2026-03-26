---
name: vintasoftware-nextjs-fastapi-template
description: >-
  Architecture and stack conventions from the Vinta Next.js + FastAPI template
  (Zod, OpenAPI client, fastapi-users, shadcn, UV, Docker, Vercel). Use when
  aligning this monorepo with that template or building full-stack TS + Python APIs.
---

# Next.js FastAPI template (Vinta) — conventions

Derived from [vintasoftware/nextjs-fastapi-template](https://github.com/vintasoftware/nextjs-fastapi-template) README and docs: [documentation site](https://vintasoftware.github.io/nextjs-fastapi-template/).

## Goals

- **End-to-end type safety**: Typed clients generated from the OpenAPI schema keep frontend and backend contracts aligned.
- **Fast iteration**: Regenerate the client when FastAPI routes change so Next.js stays in sync.
- **Async-first backend**: Prefer async DB and route handlers for throughput and tests.

## Stack highlights

| Area | Choices |
|------|---------|
| Frontend | Next.js, TypeScript, Zod validation, shadcn/ui, Tailwind |
| Backend | FastAPI, Pydantic, async routes |
| Auth | fastapi-users (JWT, password hashing, email recovery) |
| API client | OpenAPI-fetch from generated schema |
| Python tooling | UV for deps and packaging |
| Dev / deploy | Docker Compose, pre-commit, Vercel-oriented deployment |

## Practices to mirror

1. **Single source of truth for API types** — OpenAPI schema drives generated TypeScript client types; avoid duplicating DTOs by hand on the frontend.
2. **Validate at boundaries** — Zod on the TS side; Pydantic on the Python side; keep shapes consistent with the spec.
3. **Auth as a first-class layer** — Use established patterns (JWT, secure cookies, recovery flows) rather than ad-hoc session code.
4. **Tooling** — Lint/format in pre-commit; keep CI green before merging.

For setup steps, folder layout, and deployment, use the official [Get Started](https://vintasoftware.github.io/nextjs-fastapi-template/get-started/) guide rather than guessing file paths from memory.

*Disclaimer from upstream: the template is not affiliated with Vercel.*
