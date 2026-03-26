---
name: cursorrules-collection
description: >-
  Local copy of nedcodes-ok cursor rules (.cursorrules + .mdc) for languages,
  frameworks, tools, and practices. Use when editing matching stacks or when the user
  wants Cursor rules aligned with this collection; prefer rules-mdc for Agent mode.
---

# cursorrules-collection (vendored)

Imported from [nedcodes-ok/cursorrules-collection](https://github.com/nedcodes-ok/cursorrules-collection) (MIT).

## Layout

| Path | Use |
|------|-----|
| [rules/](rules/) | `.cursorrules`-style text files by topic (`languages/`, `frameworks/`, `tools/`, `practices/`) |
| [rules-mdc/](rules-mdc/) | Cursor **Agent mode** rules with YAML frontmatter (`alwaysApply`, `globs`, `description`) |

Upstream recommends **rules-mdc** for Agent mode (`.mdc` can scope by glob). To activate globally in this repo, copy chosen files into `.cursor/rules/` (see upstream README).

## When to read which file

- **TypeScript / React / Next.js** → `rules/languages/typescript.cursorrules`, `rules/frameworks/react.cursorrules`, `rules/frameworks/nextjs.cursorrules` (or matching `.mdc` under `rules-mdc/`).
- **Python / FastAPI** → `rules/languages/python.cursorrules`, `rules/frameworks/fastapi.cursorrules`.
- **Cross-cutting** → `rules/practices/` (testing, security, API design, etc.).

Tailor rules to this monorepo: delete stack you do not use; add “Our conventions” sections per upstream guidance.
